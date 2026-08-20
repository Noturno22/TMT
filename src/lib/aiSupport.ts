import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';
import { i18n } from '@/lib/i18n';

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
        error: typeof data.error === 'string' ? data.error : i18n.t('aiErrors.contact'),
      };
    }
    if (typeof data.reply !== 'string' || !data.reply.trim()) {
      return { reply: '', error: i18n.t('aiErrors.noResponse') };
    }
    return { reply: data.reply, error: null };
  } catch {
    return { reply: '', error: i18n.t('aiErrors.connection') };
  }
}

export async function analyzeImage(
  imageBase64: string,
  mimeType: string,
  prompt?: string,
): Promise<AiResult> {
  try {
    const res = await fetch(AI_FN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', text: prompt || 'Analisa este setup de trading.' }],
        image: { data: imageBase64, mimeType },
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { reply?: unknown; error?: unknown };
    if (!res.ok || data.error) {
      return {
        reply: '',
        error: typeof data.error === 'string' ? data.error : i18n.t('aiErrors.contact'),
      };
    }
    if (typeof data.reply !== 'string' || !data.reply.trim()) {
      return { reply: '', error: i18n.t('aiErrors.noResponse') };
    }
    return { reply: data.reply, error: null };
  } catch {
    return { reply: '', error: i18n.t('aiErrors.connection') };
  }
}
