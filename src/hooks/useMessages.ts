import { useCallback, useEffect, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/lib/supabase';
import { subscribeToChanges } from '@/lib/realtime';
import { mergeMessages } from '@/core/community';
import { useAuth } from '@/hooks/useAuth';
import type { Message, MessageReaction } from '@/core/types';

const PAGE_SIZE = 100;

export type MessagesTarget = { channelId: string } | { conversationId: string };

export function useMessages(target: MessagesTarget) {
  const { user } = useAuth();
  const channelId = 'channelId' in target ? target.channelId : undefined;
  const conversationId = 'conversationId' in target ? target.conversationId : undefined;

  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<MessageReaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  // Reseta o estado quando o alvo (canal ou conversa) muda, durante o render.
  const targetKey = channelId ?? conversationId ?? '';
  const [prevTargetKey, setPrevTargetKey] = useState(targetKey);
  if (targetKey !== prevTargetKey) {
    setPrevTargetKey(targetKey);
    setMessages([]);
    setReactions([]);
    setHasOlder(false);
    setLoading(true);
    setError(null);
  }

  const query = useCallback(() => {
    let q = supabase.from('messages').select('*').is('deleted_at', null);
    if (channelId) q = q.eq('channel_id', channelId);
    else if (conversationId) q = q.eq('conversation_id', conversationId);
    return q;
  }, [channelId, conversationId]);

  const loadReactions = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setReactions([]);
      return;
    }
    const { data } = await supabase
      .from('message_reactions')
      .select('*')
      .in('message_id', ids);
    setReactions((data || []) as MessageReaction[]);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { data, error: err } = await query()
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);
      if (err) throw err;
      const rows = ((data as Message[] | null) || []).reverse();
      setMessages((prev) => mergeMessages(prev, rows));
      await loadReactions(rows.map((m) => m.id));
      setHasOlder((data || []).length === PAGE_SIZE);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar mensagens.');
    } finally {
      setLoading(false);
    }
  }, [query, loadReactions]);

  const loadOlder = useCallback(async () => {
    if (loadingOlder) return;
    const oldest = messages[0];
    if (!oldest) return;
    setLoadingOlder(true);
    try {
      const { data } = await query()
        .lt('created_at', oldest.created_at)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);
      const rows = ((data as Message[] | null) || []).reverse();
      setMessages((prev) => [...rows, ...prev]);
      await loadReactions(rows.map((m) => m.id));
      setHasOlder((data || []).length === PAGE_SIZE);
    } finally {
      setLoadingOlder(false);
    }
  }, [query, loadReactions, loadingOlder, messages]);

  const send = useCallback(
    async (text: string, imageUrl?: string | null) => {
      if (!user) return;
      const clientId = Crypto.randomUUID();
      const optimistic: Message = {
        id: clientId,
        channel_id: channelId ?? null,
        conversation_id: conversationId ?? null,
        user_id: user.id,
        parent_id: null,
        text,
        image_url: imageUrl ?? null,
        boom_id: null,
        edited_at: null,
        deleted_at: null,
        client_msg_id: clientId,
        created_at: new Date().toISOString(),
        pending: true,
      };
      setMessages((prev) => [...prev, optimistic]);

      const { error } = await supabase.from('messages').insert({
        channel_id: channelId ?? null,
        conversation_id: conversationId ?? null,
        user_id: user.id,
        text,
        image_url: imageUrl ?? null,
        client_msg_id: clientId,
      });

      if (error && error.code !== '23505') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === clientId ? { ...m, pending: false, failed: true } : m,
          ),
        );
      }
    },
    [channelId, conversationId, user],
  );

  const retry = useCallback(async (message: Message) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === message.id ? { ...m, failed: false, pending: true } : m,
      ),
    );
    const { error } = await supabase.from('messages').insert({
      channel_id: message.channel_id,
      conversation_id: message.conversation_id,
      user_id: message.user_id,
      text: message.text,
      image_url: message.image_url,
      client_msg_id: message.client_msg_id,
    });
    if (error && error.code !== '23505') {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id ? { ...m, pending: false, failed: true } : m,
        ),
      );
    }
  }, []);

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!user) return;
      const existing = reactions.find(
        (r) => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji,
      );
      if (existing) {
        await supabase.from('message_reactions').delete().eq('id', existing.id);
      } else {
        await supabase
          .from('message_reactions')
          .insert({ message_id: messageId, user_id: user.id, emoji });
      }
      await loadReactions(messages.map((m) => m.id));
    },
    [user, reactions, messages, loadReactions],
  );

  const softDelete = useCallback(async (messageId: string) => {
    await supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId);
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  useEffect(() => {
    const timer = setTimeout(refresh, 0);
    const listeners: { table: string; filter?: string; onEvent: () => void }[] = [];
    if (channelId) {
      listeners.push({
        table: 'messages',
        filter: `channel_id=eq.${channelId}`,
        onEvent: () => refresh(),
      });
    }
    if (conversationId) {
      listeners.push({
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
        onEvent: () => refresh(),
      });
    }
    listeners.push({ table: 'message_reactions', onEvent: () => refresh() });

    const cleanup = subscribeToChanges(
      `community-msgs-${channelId ?? conversationId}`,
      listeners,
    );
    const poll = setInterval(refresh, 15_000);
    return () => {
      clearTimeout(timer);
      cleanup();
      clearInterval(poll);
    };
  }, [channelId, conversationId, refresh]);

  return {
    messages,
    reactions,
    loading,
    error,
    hasOlder,
    loadingOlder,
    refresh,
    loadOlder,
    send,
    retry,
    toggleReaction,
    softDelete,
  };
}
