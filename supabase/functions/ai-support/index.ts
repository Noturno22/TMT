import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const geminiApiKey = Deno.env.get('GEMINI_API_KEY') ?? '';
const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';
const apiBase = 'https://generativelanguage.googleapis.com/v1beta';
const maxTurns = 20;
const maxTextLength = 2000;

const SYSTEM_PROMPT = `Tu és o assistente de IA do "The Magic Trader" (TMT), um serviço de sinais e análises de trading Forex. Responde sempre em português, de forma clara e simpática, em respostas concisas (até ~120 palavras, salvo se pedirem mais detalhe).

O que sabes sobre o TMT:
- Sinais: entradas BUY / SELL / AGUARDAR em pares Forex (EUR/USD, GBP/USD, USD/JPY, XAU/USD, etc.), em timeframes M15, H1 e H4, com preço de entrada, Take Profit (TP), Stop Loss (SL) e rácio de risco/recompensa (RR).
- Planos e preços mensais (USD ou Kwanza): Grátis 0 USD, Basic 14.99 USD / 10.000 Kz, Pro 29.99 USD / 20.000 Kz, Premium 49.99 USD / 35.000 Kz. Confirma sempre os preços atuais na app.
- Alertas: notificações push, WhatsApp e Telegram (planos pagos); os horários dos alertas gerem-se na secção "Alertas".
- Gestão de banca: controlo de capital, metas e risco por operação (disponível no plano Premium).
- A app tem "Análises" (análises diárias), "Histórico" (sinais fechados), "Horários"/BOOM (janelas de alta volatilidade) e "Comunidade" (votar BUY/SELL e comentar).

Quando o utilizador enviar uma imagem de um setup de trading (MetaTrader 5, gráfico, etc.), analisa:
1. Tendência predominante (alta/baixa/lateral)
2. Níveis de suporte e resistência visíveis
3. Padrões de candlestick identificados
4. Indicadores visíveis no gráfico (RSI, MACD, Médias, Bollinger, etc.)
5. Zonas de entrada potenciais (BUY/SELL) com preço alvo e stop loss sugerido
6. Rácio risco/recompensa estimado
7. Nível de confiança na análise (baixo/médio/alto)

Formato da resposta:
- 📊 **Análise do Setup**
- Tendência: [descrição]
- Padrões: [lista]
- Indicadores: [lista]
- 🎯 **Sugestão**: [BUY/SELL] @ [preço] | TP: [preço] | SL: [preço]
- ⚡ RR: [rácio] | Confiança: [baixo/médio/alto]
- ⚠️ Nota: Esta é uma análise técnica automática. Trading envolve risco.

Regras:
- Se não souberes algo específico da app, diz honestamente e sugere contactar o suporte do TMT.
- Não és consultor financeiro. Se falarem de investir/operar, recorda sempre que trading envolve risco.
- Formata com parágrafos curtos e listas com "-".`;

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  });
}

function errorJson(message: string, status = 400): Response {
  return json({ error: message }, status);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  });

  if (req.method !== 'POST') return errorJson('Método não permitido.', 405);
  if (!geminiApiKey) return errorJson('GEMINI_API_KEY não configurada.', 500);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorJson('Corpo inválido.');
  }

  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  const imageData = body.image as { data: string; mimeType: string } | undefined;

  // Build contents from messages
  let contents = rawMessages
    .filter(
      (m): m is { role: unknown; text: string } =>
        !!m && typeof m === 'object' && typeof m.text === 'string' && m.text.trim().length > 0,
    )
    .slice(-maxTurns)
    .map((m) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text.slice(0, maxTextLength) }],
    }));

  // If an image is provided, add it to the last user message or create a new one
  if (imageData && imageData.data) {
    const imagePart = {
      inline_data: {
        mime_type: imageData.mimeType || 'image/jpeg',
        data: imageData.data,
      },
    };

    const analysisPrompt = body.prompt as string || 'Analisa esta imagem de um setup de trading. Identifica tendência, padrões, indicadores e sugere entrada com TP/SL.';

    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
      // Append image to last user message
      contents[contents.length - 1].parts.push({ text: analysisPrompt } as any);
      contents[contents.length - 1].parts.push(imagePart as any);
    } else {
      // Create a new user message with the image
      contents.push({
        role: 'user',
        parts: [{ text: analysisPrompt } as any, imagePart as any],
      });
    }
  }

  if (contents.length === 0) return errorJson('Envia uma mensagem ou imagem para começares.');

  try {
    const res = await fetch(`${apiBase}/models/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiApiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('Gemini API error', res.status, data);
      return errorJson('A IA não conseguiu responder. Tenta novamente em instantes.', 502);
    }

    const parts: Array<{ text?: string }> = data?.candidates?.[0]?.content?.parts ?? [];
    const reply = parts
      .filter((p) => typeof p?.text === 'string')
      .map((p) => (p.text as string).trim())
      .filter(Boolean)
      .join('\n');

    if (!reply) return errorJson('A IA não gerou uma resposta.', 500);

    return json({ reply, model: data?.modelVersion ?? model });
  } catch (err: unknown) {
    console.error('ai-support error', err);
    return errorJson('Erro ao contactar a IA.', 500);
  }
});
