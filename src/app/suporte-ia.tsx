import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppText } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/core/theme';
import { askAssistant, type AiMessage } from '@/lib/aiSupport';

const STORAGE_KEY = 'tmt_ai_chat';

const SUGGESTIONS = [
  'O que é o The Magic Trader?',
  'Como assino o plano Pro?',
  'O que significa um sinal BUY com RR 1:2.5?',
  'Como funciona a gestão de banca?',
];

const AI_COLORS: [string, string] = [Colors.primary, 'rgba(22,164,58,0.55)'];

function isAiMessage(v: unknown): v is AiMessage {
  return (
    !!v &&
    typeof v === 'object' &&
    ('text' in v) &&
    typeof (v as AiMessage).text === 'string' &&
    ((v as AiMessage).role === 'user' || (v as AiMessage).role === 'model')
  );
}

export default function SuporteIaScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<AiMessage>>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) setMessages(parsed.filter(isAiMessage).slice(-40));
      } catch {}
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(messages)).catch(() => {});
  }, [messages]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [messages, sending, scrollToEnd]);

  const send = useCallback(
    async (raw?: string) => {
      const text = (raw ?? input).trim();
      if (!text || sending) return;
      setInput('');
      setError(null);
      const next: AiMessage[] = [...messages, { role: 'user', text }];
      setMessages(next);
      setSending(true);
      const result = await askAssistant(next);
      if (result.error) {
        setError(result.error);
      } else {
        setMessages([...next, { role: 'model', text: result.reply }]);
      }
      setSending(false);
    },
    [input, sending, messages],
  );

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <LinearGradient colors={['#07070F', '#0A0A14', '#05050D']} style={styles.bg}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
          keyboardVerticalOffset={0}>
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              style={styles.headerBtn}
              accessibilityRole="button"
              accessibilityLabel="Fechar suporte">
              <Ionicons name="close" size={22} color={Colors.text} />
            </Pressable>
            <LinearGradient colors={AI_COLORS} style={styles.logoGlow}>
              <Ionicons name="sparkles" size={22} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.headerText}>
              <AppText variant="h2">Suporte IA</AppText>
              <AppText variant="small" style={{ color: Colors.textMuted }}>
                Assistente The Magic Trader
              </AppText>
            </View>
            <Pressable
              onPress={clearChat}
              hitSlop={10}
              style={styles.headerBtn}
              accessibilityRole="button"
              accessibilityLabel="Limpar conversa">
              <Ionicons name="trash-outline" size={20} color={Colors.textMuted} />
            </Pressable>
          </View>

          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(_, i) => `${i}`}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              messages.length === 0 ? (
                <View style={styles.welcome}>
                  <AppText variant="h1" style={styles.welcomeTitle}>Olá, sou o assistente do TMT 👋</AppText>
                  <AppText variant="muted" style={styles.welcomeSub}>
                    Tiro dúvidas sobre sinais, planos, alertas, banca e a app.
                  </AppText>
                  <View style={styles.suggestions}>
                    {SUGGESTIONS.map((s) => (
                      <Pressable
                        key={s}
                        onPress={() => send(s)}
                        disabled={sending}
                        style={({ pressed }) => [styles.suggestion, pressed && { opacity: 0.7 }]}>
                        <AppText variant="small" style={{ color: Colors.primary, fontWeight: '600' }}>
                          {s}
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null
            }
            renderItem={({ item, index }) => (
              <MessageBubble item={item} isLast={index === messages.length - 1} />
            )}
          />

          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={Colors.destructive} />
              <AppText variant="small" style={styles.errorText}>{error}</AppText>
            </View>
          ) : null}

          {sending ? (
            <View style={styles.typingRow}>
              <LinearGradient colors={AI_COLORS} style={styles.typingAvatar}>
                <Ionicons name="sparkles" size={12} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            </View>
          ) : null}

          <View style={styles.inputRow}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Escreve a tua pergunta…"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
              maxLength={2000}
              returnKeyType="send"
              onSubmitEditing={() => send()}
            />
            <Pressable
              onPress={() => send()}
              disabled={!input.trim() || sending}
              accessibilityRole="button"
              accessibilityLabel="Enviar"
              style={[styles.sendBtn, (!input.trim() || sending) && { opacity: 0.5 }]}>
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function MessageBubble({ item, isLast }: { item: AiMessage; isLast: boolean }) {
  const isUser = item.role === 'user';
  if (isUser) {
    return (
      <View style={[styles.bubbleRow, styles.userRow]}>
        <View style={styles.userBubble}>
          <AppText style={styles.userText}>{item.text}</AppText>
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.bubbleRow, styles.modelRow]}>
      <LinearGradient colors={AI_COLORS} style={styles.modelAvatar}>
        <Ionicons name="sparkles" size={13} color="#FFFFFF" />
      </LinearGradient>
      <View style={[styles.modelBubble, isLast && styles.modelBubbleLast]}>
        <AppText style={styles.modelText}>{item.text}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { padding: Spacing.xs },
  logoGlow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.lg },
  welcome: { paddingVertical: Spacing.lg, gap: Spacing.sm },
  welcomeTitle: { fontSize: 20 },
  welcomeSub: { lineHeight: 20 },
  suggestions: { marginTop: Spacing.sm, gap: Spacing.sm },
  suggestion: {
    backgroundColor: Colors.surface,
    borderColor: 'rgba(22,164,58,0.35)',
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  userRow: { justifyContent: 'flex-end' },
  modelRow: { justifyContent: 'flex-start' },
  userBubble: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    borderBottomRightRadius: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxWidth: '78%',
  },
  userText: { color: '#FFFFFF', lineHeight: 20 },
  modelAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelBubble: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    borderBottomLeftRadius: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxWidth: '78%',
  },
  modelBubbleLast: { borderBottomLeftRadius: Radius.lg },
  modelText: { color: Colors.textBody, lineHeight: 20 },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md },
  typingAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typingBubble: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    minWidth: 56,
    alignItems: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderColor: 'rgba(239,68,68,0.35)',
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  errorText: { color: Colors.destructive, flex: 1 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderTopColor: Colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
