import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';

export interface AiMessage {
  role: 'user' | 'model';
  text: string;
}

export interface AiResult {
  reply: string;
  error: string | null;
}

const AI_FN = `${SUPABASE_URL}/functions/v1/ai-support`;

export async function askAssistant(messages: AiMessage[]): Promise<AiResult> {
  const body = messages.slice(-20).map((m) => ({ role: m.role, text: m.text }));
  try {
    const res = await fetch(AI_FN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ messages: body }),
    });
    const data = (await res.json().catch(() => ({}))) as { reply?: unknown; error?: unknown };
    if (!res.ok || data.error) {
      return {
        reply: '',
        error: typeof data.error === 'string' ? data.error : 'Erro ao contactar o suporte. Tenta novamente.',
      };
    }
    if (typeof data.reply !== 'string' || !data.reply.trim()) {
      return { reply: '', error: 'A IA não devolveu uma resposta.' };
    }
    return { reply: data.reply, error: null };
  } catch {
    return { reply: '', error: 'Erro de ligação. Verifica a tua internet e tenta novamente.' };
  }
}
