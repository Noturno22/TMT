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
- Migrations existentes: `20260814*` (whatsapp otp, repair subscriptions, pgcrypto wrappers), `20260815000000_comunidade_workspace.sql` (Fase 1: user_profiles, channels, conversations, messages, reactions, RLS, triggers, bot "TMT Bot" `11111111-1111-1111-1111-111111111111`, seed de canais, backfills), `20260816*` (weekend crypto + Fases 2–4), `20260819*` a `20260821*` (trade journal, cron pipeline fix, admin notifications, wallet_movements, withdrawal_requests, expand free plan, message_reports, channel_management) — **TODAS APLICADAS em produção a 2026-08-21**.
- Edge functions: `generate-crypto-signals`, `whatsapp-auth`, `ai-support`, `send-notification` (**deployada 2026-08-21**; secret opcional `EXPO_PUSH_ACCESS_TOKEN` ainda não definida).

## Estado de git
- Commit `484fae0`: "feat(fase5): server-side wallet/withdrawals, analytics toggle, trade journal prices, SMC filter" (24 ficheiros, +558/-61). Branch `feature/fase5-production-readiness`.
- Commit `b3f6f29`: "feat: community phases 1-4 + signal system overhaul + admin panel + trade journal" (149 ficheiros, +41577/-15877).

---

## Fase 5 — Production Readiness + Feature Completion (PLANEADA, 2026-08-20)

### Bloco A — Deploy ✅ CONCLUÍDO (2026-08-21)
1. **Migrations aplicadas no Supabase** ✅ (8 aplicadas: `20260819030000` → `20260821000001`)
   - Correcções prévias ao push:
     - `20260819_admin_notifications.sql` renomeado → `20260819050000_admin_notifications.sql` (timestamp inválido; entrada fantasma `20260819` reparada com `supabase migration repair --status reverted 20260819`)
     - Duplicado `20260820000000` resolvido: `expand_free_plan.sql` renomeado → `20260820020000_expand_free_plan.sql`
     - `20260819040000_fix_cron_pipeline.sql` estava TRUNCADO e com `cron.unschedule('gerar-sinais-hora')` não-defensivo — reescrito: unschedule defensivo, garante os 17 crons + close-signals idempotentemente, e WARNING se `app_config.service_role_key` faltar (não disparou → secret presente)
2. **Edge function `send-notification` deployada** ✅ (`supabase functions deploy send-notification`)
3. **Pipeline validado:** `generate-crypto-signals` responde HTTP 401 em ~1s sem auth (correcto); cron jobs garantidos pela migration. Teste end-to-end pendente: gerar sinais na app logada.

### Bugs corrigidos a 2026-08-21
- **Require cycles** (`admin/index.ts` ↔ painéis): `WithdrawalsPanel`, `MessagingPanel`, `ReportsPanel`, `ChannelsPanel` agora importam `SearchBar`/`FilterChips`/`Toast` directamente (`./X`) em vez do barrel.
- **Crash `notifications.filter is not a function`**: edge function devolve `{ data: [...] }`; `getNotifications()` agora normaliza para array tipado (`AdminNotification[]`).

### Bloco B — Funcionalidades incompletas ✅ CONCLUÍDO
4. **Wallet server-side:** ✅ Tabela `wallet_movements` + RLS + migration `20260820000000`, hook `useMovements` migrado para local-first (Supabase + AsyncStorage cache). UI actualizada em `depositos.tsx`.
5. **Withdrawal server-side:** ✅ Tabela `withdrawal_requests` + RLS + migration `20260820010000`, `submitWithdrawalRequest` + `listWithdrawals` + `approveWithdrawal` + `rejectWithdrawal` em `adminApi.ts`, novos cases no edge function `admin-manage`. UI de depósitos submete via server-side.
6. **Analytics Dashboard:** ✅ `AnalyticsBreakdown.tsx` integrado no ecrã Analises via toggle Signals/Analytics (botões pill com ícones bar-chart/stats-chart).
7. **Trade Journal completo:** ✅ `AddTradeModal` tem entry/exit price fields (`diario.tradeEntry`, `diario.tradeExit`), passados ao `onSave`.
8. **Filtro SMC setup:** ✅ Chips de filtro (BOS, CHoCH, OB, FVG, COMBO) no ecrã Analises, com `analises.filterSmc` i18n em 14 locales.

### Bloco C — UX Polish
9. **Estender Onboarding Tour:** ✅ CONCLUÍDO — passos 5 (Comunidade, target `tour:comunidade-search`) e 6 (Diário Trader, target `tour:diario-title`) em `OnboardingTour.tsx`. Secção `tour` (skip/next/finish + steps 1–6) adicionada aos **14 locales** (só o pt tinha; fallbackLng: 'pt' cobria o resto).
10. **Pull-to-refresh:** ✅ CONCLUÍDO — Início (`Promise.all` de history+signals+hours), Análises (`refetch` de sinais), Horários (`useBoomHours.refetch` novo em useHistory/useSignals).
11. **Remover admin access code hardcoded:** ✅ CONCLUÍDO — `adminGate.ts` usa RPC `verify_admin_access_code(p_code)` (security definer, sha256 em `app_config.admin_access_code`, email tem de constar em `app_config.admin_emails`). Migration `20260822000000_admin_access_code_rpc.sql` **APLICADA em produção** (2026-08-21).
12. **Notificação de expiração premium:** ✅ CONCLUÍDO — `syncPremiumExpiryNotifications(userId, periodEnd)` em `notifications.ts`: agenda lembretes locais datados a T−3d e T−1d do `current_period_end` (canal `planos`), dedup por periodEnd via AsyncStorage (`premium_expiry_alarms:<uid>`) — renovação re-agenda; `cancelPremiumExpiryNotifications` limpa se deixar de ser premium. Hook `usePremiumExpiryNotification()` em `useNotifications.ts`, montado no `NotificationInit` (`_layout.tsx`). i18n `notifications.expiry3Title/Body`, `expiry1Title/Body` nos 14 locales.
13. **Store real:** ✅ CONCLUÍDO — migration **`20260822010000_store_products.sql` APLICADA em produção** (tabela + RLS + seed 8 itens + trigger updated_at) + hook **`useStoreProducts.ts`** (local-first: AsyncStorage → Supabase `active=true` por `sort_order` → fallback `DEFAULT_STORE_PRODUCTS`; devolve shape `StoreProduct` = antigo `StoreItem`) + **`loja.tsx` wired**: `STORE_ITEMS`/interface removidos, consome `useStoreProducts()`, estatísticas do hero agora calculadas dos dados reais (`avgRating` em vez de "4.6" hardcoded) e **pull-to-refresh adicionado** (padrão `RefreshControl` do inicio.tsx). **Nota:** se a sessão paralela fizer pop do stash `19179d5` (redesign da loja), este ficheiro vai conflituar — resolver mantendo o wiring (`useStoreProducts`) e reaplicando o redesign visual.
14. **Exportar Diário Trader:** ✅ CONCLUÍDO — `ExportButton` (CSV via Share) no header do `diario-trader.tsx` com colunas data/par/direção/entrada/saída/lotes/resultado/pnl/pips/notas; i18n `diario.exportCsv` nos 14 locales.

### Outros (2026-08-21, working tree)
- **Gating plano free expandido** (`core/gating.ts`): FREE ganha XAU/USD + AUD/USD + H1 (alinhado com migration `20260820020000_expand_free_plan.sql` já aplicada); fix `pairLocked` nas Análises (par 'Todos' nunca bloqueia).
- **Weekend crypto resiliente** (`cryptoSignals.ts`): erros transitórios (timeout/abort/network) marcados `transient` → `ensureWeekendCryptoSignals()` permite retry na próxima tentativa.
- **Lint:** `eslint-plugin-react-hooks@7.1.1` (via eslint-config-expo@56.0.4) activa regras React Compiler — **42 erros pré-existentes no HEAD** (refs-during-render em worklets reanimated, purity `Date.now()`, setState-in-effect nos painéis admin). Working tree não introduz nenhum erro novo. Limpeza é dívida técnica separada.
- **Revalidação global (2026-08-21, working tree combinado de 2 sessões):** `tsc --noEmit` → 0; eslint nos 22 ficheiros TS alterados → 3 erros = linhas 733/992/1265 de `admin.tsx` (`Date.now()` during render), **byte-idênticas ao HEAD** (pré-existentes); 16 warnings (`import/first`, `no-unused-vars`) também pré-existentes. Ficheiros do Bloco C (#12): 0 problemas.

### Pendente (actualizado 2026-08-22)
1. ~~Aplicar migrations no Supabase~~ ✅ **FEITO** — `20260822000000_admin_access_code_rpc.sql` (aplicada pela sessão paralela) + `20260822010000_store_products.sql` (aplicada nesta sessão via `supabase db push`, token configurado com `supabase login`). `migration list` = local e remoto sincronizados.
2. ~~Wiring loja.tsx → useStoreProducts~~ ✅ **FEITO** — ver Bloco C #13. Único cuidado pendente: conflito de merge em `loja.tsx` se a sessão paralela fizer pop do stash `19179d5`.
3. ~~Fix: aprovação de comprovativos não ativava o plano~~ ✅ **FEITO (2026-08-22)** — causa raiz: CHECK constraint `subscriptions_plan_check` só aceitava `('FREE','PREMIUM')` e o fluxo escreve `free|basic|pro|premium` (minúsculas) → upsert falhava. Migration `20260822060000_fix_subscriptions_plan_check.sql` **APLICADA** (constraint case-insensitive com os 4 tiers + normalização de linhas existentes). Edge function `admin-manage` actualizada e **DEPLOYADA**: `update_subscription_expiry` agora preserva o `plan` existente (não cria linha sem plan) e escreve `current_period_end`; `expiring_count` conta `expires_at` OU `current_period_end`. `tsc --noEmit` = 0 erros. Pendente: commit.

### Pitfalls Fase 5
- Migrations: aplicar em ordem cronológica; Fase 1 primeiro (funda as tabelas base).
- `send-notification`: requer `EXPO_PUSH_ACCESS_TOKEN` como secret no Supabase.
- Wallet: não quebrar o fluxo existente de depósito via receipt upload.
- Admin: withdrawal review precisa de nova tab/section no admin panel existente.
