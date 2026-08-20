# gonext.md — Estado do Projeto TMT Mobile

> Snapshot de progresso. Actualizado a 2026-08-20.

## Contexto
- App Expo/React Native (SDK 56, expo-router v56) com i18n em 14 locales (pt, en, es, fr, de, it, nl, ja, zh, ko, ru, sw, ar, ln).
- Backend Supabase (migrations em `supabase/migrations/`).
- **AGENTS.md diz:** ler docs versionadas em `https://docs.expo.dev/versions/v56.0.0/` antes de escrever código.

## Plano de comunidade (8 funcionalidades aprovadas, faseado)
1. **Fase 1 — Perfil + Presença** ✅ CONCLUÍDA
2. **Fase 2 — Editar + Pesquisar** ✅ CONCLUÍDA (falta aplicar migration no Supabase)
3. **Fase 3 — Push + @menções** ✅ CONCLUÍDA (falta aplicar migration + deploy edge function + secret)
4. **Fase 4 — Partilhar sinal/análise no feed/#sinais** ✅ CONCLUÍDA (falta aplicar migration no Supabase)

## Fase 1 — Perfil + Presença (CONCLUÍDA)
- `src/core/community.ts`: `PRESENCE_ONLINE_WINDOW_MS` (2 min) + `isUserOnline(profile)`.
- `src/hooks/usePresence.ts`: heartbeat 60s (upsert em `user_profiles` com `display_name` de `displayName(user)`, `onConflict: 'user_id'`), `AppState` active→online / background→offline. Componente `<Presence />` montado no root layout `src/app/_layout.tsx` dentro de `<AuthProvider>`.
- `src/components/community/UserAvatar.tsx`: avatar (avatar_url ou inicial), dot online, `onPress`, props `size`/`role`.
- `DmRow.tsx`: UserAvatar + dot online + tick 30s + prop `onOpenProfile`.
- `MessageBubble.tsx` / `MessageList.tsx`: avatar 28 + nome pressable → perfil.
- Perfil: `src/app/(tabs)/comunidade/user/[userId].tsx` + rota no `comunidade/_layout.tsx`. Premium via `supabase.rpc('is_premium', { uid })` (função security definer) com **async IIFE** (o `.then().catch()` do PostgrestBuilder falha typings).
- O ecrã de perfil usa o padrão "adjust state during render" para reset do estado premium (evita `react-hooks/set-state-in-effect`).

## Fase 2 — Editar + Pesquisar (CONCLUÍDA)
### Editar mensagens
- `useMessages.edit(message, text)`: optimistic update `text` + `edited_at`, depois `update` no Supabase; reverte com `refresh()` em erro.
- `MessageBubble`: long-press na mensagem própria → menu `workspace.edit` / `workspace.deleteMessage` (estilo `destructive`). Edição inline (TextInput + Guardar/Cancelar, `AppButton` variant `ghost` para cancelar). Marcador "Editado" (`workspace.edited`) junto à hora quando `message.edited_at != null`.
- `editable` = própria, sem `boom_id`, sem `pending`, sem `failed`.
- `MessageList` + ecrãs `canais/[channelId].tsx` e `dm/[conversationId].tsx`: prop `onEdit` passada.

### Pesquisa global
- **Migration a aplicar no Supabase:** `supabase/migrations/20260816010000_community_search.sql` (extensão `pg_trgm`, índice GIN em `messages(text)` com `gin_trgm_ops`, função `search_messages(q)` security definer que respeita RLS de DMs via `conversation_members`).
- `src/hooks/useMessageSearch.ts`: debounce 350ms, `supabase.rpc('search_messages', { q })`, todo setState dentro do `setTimeout` (evita set-state-in-effect).
- Ecrã `src/app/(tabs)/comunidade/pesquisa.tsx` (modal): input autofocus + lista com avatar, remetente, alvo (canal/DM), tempo; tap navega para o canal ou DM. Rota registada no `comunidade/_layout.tsx`.
- Entrada: barra de pesquisa no `comunidade/index.tsx` (acima do segment).

## Fase 3 — Push + @menções (CONCLUÍDA)
Comportamento aprovado: **DM → notifica sempre o outro membro; Canal → só @menções** (os canais são abertos, sem lista de membros; evitar spam).
- **Migrations a aplicar no Supabase:**
  - `supabase/migrations/20260816010000_community_search.sql` (Fase 2 — pesquisa)
  - `supabase/migrations/20260816020000_push_mentions.sql` (Fase 3 — `push_tokens` + `message_mentions` + RLS own-message para insert)
- **Edge function** `supabase/functions/send-notification/index.ts`:
  - POST `{ messageId }`, valida JWT do autor (rejeita se `message.user_id !== user.id` — defense-in-depth contra spam).
  - Recipientes: outro membro da DM (`conversation_members`) ∪ mencionados (`message_mentions`).
  - Envia via Expo Push API (`https://exp.host/--/api/v2/push/send`, lotes de 100); remove tokens `DeviceNotRegistered`. `data.url` → `/comunidade/dm/{id}` ou `/comunidade/canais/{id}`; `channelId: 'comunidade'` (Android).
  - **Deploy:** `supabase functions deploy send-notification`; secret opcional `EXPO_PUSH_ACCESS_TOKEN`. Segue o padrão de `generate-crypto-signals` (jsr:supabase-js@2 + deno.land/std serve). `supabase/` está excluído do tsc da app.
- **App:**
  - `src/lib/notifications.ts`: canal Android `comunidade` em `ensureChannel()` + `getExpoPushToken()` (web/emulador/permissão negada → null).
  - `src/hooks/usePushToken.ts`: `PushTokenInit` montado no `_layout.tsx` (junto de `<Presence />`); upsert do token ao entrar; **delete ao sair** (fire-and-forget, `try/catch` — o builder do supabase não tem `.catch`).
  - `useMessages.send(text, imageUrl, mentionIds)`: insert com `.select('id').single()`, depois insere `message_mentions`, depois `supabase.functions.invoke('send-notification', { body: { messageId } })` (fire-and-forget). Carrega menções via `loadMentions` → expõe `mentionsByMessage`.
  - `Composer.tsx`: picker de menções — deteta token `@` (antes = início ou whitespace, sem espaço depois), lista até 6 perfis (exclui o próprio), insere `@DisplayName ` + guarda `mentionIds`; no envio filtra os ids cujo `@nome` ainda está no texto.
  - `MessageBubble.tsx` / `MessageList.tsx`: prop `mentionNames` → highlight `@nome` a `Colors.primary` (regex com escape; `renderMentionedText`).
  - i18n novas (14 locales): `workspace.notificationChannel` (nome do canal Android), `workspace.mentionHeader` (título do picker).
- **Nota:** o push server-side gera título = nome do autor e body = texto truncado (linguagem-neutro, sem i18n no edge function). Menções em mensagens editadas não re-notificam; retry não re-notifica (edge case aceite).

## Fase 4 — Partilhar sinal/análise (CONCLUÍDA)
- **Migration a aplicar no Supabase:** `supabase/migrations/20260816030000_share_signal.sql` — função security definer `public.share_signal(p_signal_id uuid, p_user_id uuid)`:
  - Valida `p_user_id = auth.uid()` (defense-in-depth — security definer bypassa RLS).
  - Localiza o canal `name='sinais'`; lê o sinal; **idempotente** via `client_msg_id = md5('share:' || signal_id || ':' || user_id)::uuid` — partilhar 2x não duplica.
  - Texto gerado em PT no servidor: `🎯 SYMBOL TIMEFRAME BUY — Entrada X | TP Y | SL Z | Confiança N%`.
  - `grant execute ... to authenticated`.
- **App:**
  - `src/lib/community.ts`: `shareSignalToFeed(userId, signalId)` (`supabase.rpc('share_signal', ...)`) + `findSinaisChannelId()` (`name='sinais'`).
  - `src/app/sinal/[id].tsx`: botão `workspace.shareToFeed` (AppButton variant `secondary`, ícone chatbubbles) após o pipsRow; sem sessão → alerta `workspace.shareLogin`; sucesso → Alert com `workspace.sharedToFeed` + acção `workspace.viewFeed` que navega para `/comunidade/canais/[channelId]` (#sinais). Erro → `workspace.shareFailed`.
  - i18n novas (14 locales): `workspace.shareToFeed`, `workspace.sharedToFeed`, `workspace.viewFeed`, `workspace.shareFailed`, `workspace.shareLogin`.
- **Nota:** booms já são backfilled para #sinais pelo bot (idempotente por `client_msg_id = boom id`); esta fase cobre o utilizador partilhar uma análise/sinal (tabela `signals`). O botão de share nativo (system sheet, `Share.share`) foi mantido no header.

## Pitfalls CRÍTICOS (não repetir)
1. **i18n encoding:** NUNCA usar `Get-Content/Set-Content` nos 14 locales JSON (corrompe UTF-8 e muda LF→CRLF). Usar `[System.IO.File]::ReadAllText/WriteAllText` + `New-Object System.Text.UTF8Encoding($false)`. Para valores CJK/RTL/Cirílico, guardar as traduções num JSON temporário UTF-8 e lê-lo no script PowerShell (PS 5.1 não parseia literais não-ASCII em .ps1).
2. **Injeção de chaves i18n:** ancorar SEMPRE em contexto único — a última chave da secção `workspace` antes do `}` fechador (Fase 2: `searchEmpty`; Fase 3: `searchEmpty`; Fase 4: `mentionHeader`). Regex: `("mentionHeader":\s*"[^"]*")(\r?\n)(\s*)(\})` e reconstruir com `$1` + `,` + `$2$3` + cada nova chave + `$2$4`. Adicionar vírgulas a cada linha excepto a última. NUNCA ancorar em `"errorTitle":` (o 1º match pode ser da secção `sinais`).
3. **npm/expo:** `npx expo install` falha com `EALLOWSCRIPTS`; instalar com `npm install <pkg>@<versão>`.
4. **`react-hooks/set-state-in-effect` (error no lint):** nunca chamar setState sincronamente no corpo de useEffect — mover para async IIFE / setTimeout callback, ou usar "adjust state during render".
5. **Exhaustive-deps:** `useAuth` devolve `user` estável (estado), usar `[user]` como dep (padrão do codebase: `useConversations`, `useSubscription`).
6. **Tipos react-native Alert:** tipar o array de botões como `AlertButton[]` (o `style: 'destructive'` dá erro TS2322 se for inferido como `string`).
7. **Typed routes (expo-router):** `.expo/types/router.d.ts` regenera automaticamente via watcher/LSP; se tiveres erro de rota "stale", o ficheiro da rota existe → a tipagem atualiza sozinha.
8. **`supabase.rpc(...).then()`** não é um Promise normal: `.catch` falha typings; usar `await` dentro de async IIFE.

## Validação
- `npx tsc --noEmit` → 0 erros.
- `npx expo lint` → 0 erros (2 warnings pré-existentes em `src/lib/i18n/index.ts`, não tocar).
- Os 14 locale JSONs validados com `ConvertFrom-Json`; bytes UTF-8 verificados (CJK/RTL/acentos); CRLF = 0.

## Admin / Config
- `ACCESS_CODE='239898'` (`src/lib/adminGate.ts`).
- `EXPO_PUBLIC_ADMIN_EMAILS=jeronimo.samaina239898@gmail.com` (`isAdminEmail` case-insensitive).
- Payment/depositos + share-intent de comprovativos já implementados (não reverter).
- Migrations existentes: `20260814*` (whatsapp otp, repair subscriptions, pgcrypto wrappers), `20260815000000_comunidade_workspace.sql` (Fase 1: user_profiles, channels, conversations, messages, reactions, RLS, triggers, bot "TMT Bot" `11111111-1111-1111-1111-111111111111`, seed de canais, backfills), `20260816*` (weekend crypto + **`20260816010000_community_search.sql` Fase 2** + **`20260816020000_push_mentions.sql` Fase 3** + **`20260816030000_share_signal.sql` Fase 4 — todas PENDENTES de aplicar**), `20260820*` (**`20260820000000_wallet_movements.sql`** + **`20260820010000_withdrawal_requests.sql`** — Fase 5, PENDENTES de aplicar).
- Edge functions: `generate-crypto-signals`, `whatsapp-auth`, `ai-support`, `send-notification` (Fase 3 — **não deployada ainda**).

## Estado de git
- Commit `484fae0`: "feat(fase5): server-side wallet/withdrawals, analytics toggle, trade journal prices, SMC filter" (24 ficheiros, +558/-61). Branch `feature/fase5-production-readiness`.
- Commit `b3f6f29`: "feat: community phases 1-4 + signal system overhaul + admin panel + trade journal" (149 ficheiros, +41577/-15877).

---

## Fase 5 — Production Readiness + Feature Completion (PLANEADA, 2026-08-20)

### Bloco A — Deploy pendente (OBRIGATÓRIO)
1. **Aplicar migrations pendentes no Supabase:**
   - `20260815000000_comunidade_workspace.sql` (Fase 1)
   - `20260816010000_community_search.sql` (Fase 2)
   - `20260816020000_push_mentions.sql` (Fase 3)
   - `20260816030000_share_signal.sql` (Fase 4)
2. **Deploy edge function:** `supabase functions deploy send-notification`
3. **Validar cron pipeline:** verificar `service_role_key` em `app_config`, sinais a gerar e auto-close a funcionar em produção.

### Bloco B — Funcionalidades incompletas ✅ CONCLUÍDO
4. **Wallet server-side:** ✅ Tabela `wallet_movements` + RLS + migration `20260820000000`, hook `useMovements` migrado para local-first (Supabase + AsyncStorage cache). UI actualizada em `depositos.tsx`.
5. **Withdrawal server-side:** ✅ Tabela `withdrawal_requests` + RLS + migration `20260820010000`, `submitWithdrawalRequest` + `listWithdrawals` + `approveWithdrawal` + `rejectWithdrawal` em `adminApi.ts`, novos cases no edge function `admin-manage`. UI de depósitos submete via server-side.
6. **Analytics Dashboard:** ✅ `AnalyticsBreakdown.tsx` integrado no ecrã Analises via toggle Signals/Analytics (botões pill com ícones bar-chart/stats-chart).
7. **Trade Journal completo:** ✅ `AddTradeModal` tem entry/exit price fields (`diario.tradeEntry`, `diario.tradeExit`), passados ao `onSave`.
8. **Filtro SMC setup:** ✅ Chips de filtro (BOS, CHoCH, OB, FVG, COMBO) no ecrã Analises, com `analises.filterSmc` i18n em 14 locales.

### Bloco C — UX Polish
9. **Estender Onboarding Tour:** adicionar passos para Comunidade e Diário Trader.
10. **Pull-to-refresh:** Início, Análises, Horários.
11. **Remover/replace admin access code hardcoded** (`adminGate.ts`) — usar Supabase RPC ou env var.
12. **Notificação de expiração premium:** avisar 3 dias e 1 dia antes do fim da subscription.
13. **Store real:** substituir `STORE_ITEMS` hardcoded por tabela Supabase `store_products`, ou marcar como "coming soon" explicitamente.
14. **Exportar Diário Trader:** CSV/PDF do histórico de trades.

### Pitfalls Fase 5
- Migrations: aplicar em ordem cronológica; Fase 1 primeiro (funda as tabelas base).
- `send-notification`: requer `EXPO_PUSH_ACCESS_TOKEN` como secret no Supabase.
- Wallet: não quebrar o fluxo existente de depósito via receipt upload.
- Admin: withdrawal review precisa de nova tab/section no admin panel existente.
