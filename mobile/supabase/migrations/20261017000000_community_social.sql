-- ============================================================================
-- COMUNIDADE SOCIAL — rede social propria
-- ---------------------------------------------------------------------------
-- Adiciona a camada social em cima do workspace existente (channels/messages):
--   * follows            -> grafo de seguidores
--   * community_posts    -> posts com media (texto/imagem/video/audio) e embeds
--                           de redes externas (X, YouTube, TikTok, Instagram,
--                           Telegram)
--   * post_likes         -> gostos
--   * post_comments      -> comentarios (com respostas)
--   * contadores denormalizados em user_profiles (posts/followers/following)
--   * RLS, triggers, realtime, contas bot de seed
--
-- Re-executavel (IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Estender user_profiles
-- ---------------------------------------------------------------------------
alter table public.user_profiles
  add column if not exists bio text not null default '',
  add column if not exists cover_url text,
  add column if not exists website text,
  add column if not exists links jsonb not null default '[]'::jsonb,
  add column if not exists account_type text not null default 'user',
  add column if not exists is_verified boolean not null default false,
  add column if not exists posts_count integer not null default 0,
  add column if not exists followers_count integer not null default 0,
  add column if not exists following_count integer not null default 0;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_profiles_account_type_check'
  ) then
    alter table public.user_profiles
      add constraint user_profiles_account_type_check
      check (account_type in ('user', 'bot', 'platform'));
  end if;
end $$;

create index if not exists user_profiles_account_type_idx
  on public.user_profiles (account_type);

-- ---------------------------------------------------------------------------
-- 2) Trancar colunas sensiveis (is_verified/account_type/contadores)
-- ---------------------------------------------------------------------------
-- O trigger trg_lock_user_profiles_identity (20261002000000) tranca user_id,
-- role e username. Aqui estende-se a mesma ideia a is_verified e account_type:
-- sem isto, qualquer utilizador autenticado marcava-se como verificado.
--
-- Os contadores (posts/followers/following) sao escritos por funcoes
-- security definer quando outra tabela muda. Para nao bloquear essas escritas
-- legitimas sem abrir a porta a fraude, usamos uma flag de sessao
-- (app.social_counter) que as funcoes de contagem ligam antes do UPDATE.
create or replace function public.lock_user_profiles_social()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_counter_mode boolean := coalesce(current_setting('app.social_counter', true), '') = '1';
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.is_verified  := false;
    new.account_type := 'user';
    new.posts_count     := 0;
    new.followers_count := 0;
    new.following_count := 0;
  else
    new.is_verified  := old.is_verified;
    new.account_type := old.account_type;
    if not v_counter_mode then
      new.posts_count     := old.posts_count;
      new.followers_count := old.followers_count;
      new.following_count := old.following_count;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_lock_user_profiles_social on public.user_profiles;
create trigger trg_lock_user_profiles_social
  before insert or update on public.user_profiles
  for each row execute function public.lock_user_profiles_social();

-- Helper: liga a flag de contadores para o resto da transacao.
create or replace function public.enable_social_counter()
returns void
language sql
as $$ select set_config('app.social_counter', '1', true); $$;

-- ---------------------------------------------------------------------------
-- 3) follows
-- ---------------------------------------------------------------------------
create table if not exists public.follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  following_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);
create index if not exists follows_following_idx
  on public.follows (following_id, created_at desc);
create index if not exists follows_follower_idx
  on public.follows (follower_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 4) community_posts
-- ---------------------------------------------------------------------------
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  content text not null default '',
  media jsonb not null default '[]'::jsonb,
  kind text not null default 'post',
  network text,
  external_url text,
  external_id text,
  embed jsonb,
  visibility text not null default 'public',
  parent_id uuid references public.community_posts (id) on delete cascade,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  share_count integer not null default 0,
  is_pinned boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'community_posts_kind_check') then
    alter table public.community_posts
      add constraint community_posts_kind_check
      check (kind in ('post', 'boom', 'network', 'signal'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'community_posts_network_check') then
    alter table public.community_posts
      add constraint community_posts_network_check
      check (network is null or network in ('x', 'youtube', 'tiktok', 'instagram', 'telegram'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'community_posts_visibility_check') then
    alter table public.community_posts
      add constraint community_posts_visibility_check
      check (visibility in ('public', 'followers', 'private'));
  end if;
end $$;

create index if not exists community_posts_feed_idx
  on public.community_posts (created_at desc)
  where deleted_at is null;
create index if not exists community_posts_author_idx
  on public.community_posts (author_id, created_at desc)
  where deleted_at is null;
create unique index if not exists community_posts_external_idx
  on public.community_posts (network, external_id)
  where external_id is not null;

-- ---------------------------------------------------------------------------
-- 5) post_likes
-- ---------------------------------------------------------------------------
create table if not exists public.post_likes (
  post_id uuid not null references public.community_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists post_likes_user_idx
  on public.post_likes (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 6) post_comments
-- ---------------------------------------------------------------------------
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  parent_id uuid references public.post_comments (id) on delete cascade,
  content text not null default '',
  media jsonb not null default '[]'::jsonb,
  like_count integer not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists post_comments_post_idx
  on public.post_comments (post_id, created_at)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- 7) Contadores denormalizados
-- ---------------------------------------------------------------------------
create or replace function public.sync_profile_posts_count()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_old_vis boolean := false;
  v_new_vis boolean := false;
  v_author uuid;
begin
  if tg_op = 'INSERT' then
    v_new_vis := new.deleted_at is null;
    v_author := new.author_id;
  elsif tg_op = 'DELETE' then
    v_old_vis := old.deleted_at is null;
    v_author := old.author_id;
  else
    v_old_vis := old.deleted_at is null;
    v_new_vis := new.deleted_at is null;
    v_author := new.author_id;
  end if;

  if v_author is null then return null; end if;

  if v_old_vis and not v_new_vis then
    perform public.enable_social_counter();
    update public.user_profiles
      set posts_count = greatest(posts_count - 1, 0)
      where user_id = v_author;
  elsif not v_old_vis and v_new_vis then
    perform public.enable_social_counter();
    update public.user_profiles
      set posts_count = posts_count + 1
      where user_id = v_author;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_profile_posts_count on public.community_posts;
create trigger trg_sync_profile_posts_count
  after insert or update or delete on public.community_posts
  for each row execute function public.sync_profile_posts_count();

create or replace function public.sync_follow_counts()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_follower uuid;
  v_following uuid;
  v_delta int;
begin
  if tg_op = 'INSERT' then
    v_follower := new.follower_id; v_following := new.following_id; v_delta := 1;
  else
    v_follower := old.follower_id; v_following := old.following_id; v_delta := -1;
  end if;

  perform public.enable_social_counter();
  update public.user_profiles
    set following_count = greatest(following_count + v_delta, 0)
    where user_id = v_follower;
  perform public.enable_social_counter();
  update public.user_profiles
    set followers_count = greatest(followers_count + v_delta, 0)
    where user_id = v_following;
  return null;
end;
$$;

drop trigger if exists trg_sync_follow_counts on public.follows;
create trigger trg_sync_follow_counts
  after insert or delete on public.follows
  for each row execute function public.sync_follow_counts();

create or replace function public.sync_post_like_count()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_post uuid;
  v_delta int;
begin
  if tg_op = 'INSERT' then v_post := new.post_id; v_delta := 1;
  else v_post := old.post_id; v_delta := -1; end if;

  update public.community_posts
    set like_count = greatest(like_count + v_delta, 0)
    where id = v_post;
  return null;
end;
$$;

drop trigger if exists trg_sync_post_like_count on public.post_likes;
create trigger trg_sync_post_like_count
  after insert or delete on public.post_likes
  for each row execute function public.sync_post_like_count();

create or replace function public.sync_post_comment_count()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_post uuid;
  v_delta int;
begin
  if tg_op = 'INSERT' then v_post := new.post_id; v_delta := 1;
  else v_post := old.post_id; v_delta := -1; end if;

  update public.community_posts
    set comment_count = greatest(comment_count + v_delta, 0)
    where id = v_post;
  return null;
end;
$$;

drop trigger if exists trg_sync_post_comment_count on public.post_comments;
create trigger trg_sync_post_comment_count
  after insert or delete on public.post_comments
  for each row execute function public.sync_post_comment_count();

-- ---------------------------------------------------------------------------
-- 8) RLS
-- ---------------------------------------------------------------------------
alter table public.follows enable row level security;
alter table public.community_posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;

drop policy if exists "follows_select_auth" on public.follows;
create policy "follows_select_auth" on public.follows
  for select to authenticated using (true);
drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own" on public.follows
  for insert to authenticated with check (follower_id = auth.uid());
drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_delete_own" on public.follows
  for delete to authenticated using (follower_id = auth.uid());

drop policy if exists "community_posts_select" on public.community_posts;
create policy "community_posts_select" on public.community_posts
  for select to authenticated using (
    author_id = auth.uid()
    or visibility = 'public'
    or (visibility = 'followers' and exists (
      select 1 from public.follows f
      where f.follower_id = auth.uid() and f.following_id = community_posts.author_id
    ))
    or exists (
      select 1 from public.user_profiles up
      where up.user_id = auth.uid() and up.role = 'admin'
    )
  );
drop policy if exists "community_posts_insert_own" on public.community_posts;
create policy "community_posts_insert_own" on public.community_posts
  for insert to authenticated with check (
    author_id = auth.uid()
    and (
      public.is_premium(auth.uid())
      or exists (
        select 1 from public.user_profiles up
        where up.user_id = auth.uid()
          and (up.role = 'admin' or up.account_type in ('bot', 'platform'))
      )
    )
  );
drop policy if exists "community_posts_update_own" on public.community_posts;
create policy "community_posts_update_own" on public.community_posts
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
drop policy if exists "community_posts_delete_own" on public.community_posts;
create policy "community_posts_delete_own" on public.community_posts
  for delete to authenticated using (author_id = auth.uid());

drop policy if exists "post_likes_select_auth" on public.post_likes;
create policy "post_likes_select_auth" on public.post_likes
  for select to authenticated using (true);
drop policy if exists "post_likes_insert_own" on public.post_likes;
create policy "post_likes_insert_own" on public.post_likes
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "post_likes_delete_own" on public.post_likes;
create policy "post_likes_delete_own" on public.post_likes
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists "post_comments_select" on public.post_comments;
create policy "post_comments_select" on public.post_comments
  for select to authenticated using (
    deleted_at is null
    or user_id = auth.uid()
    or exists (
      select 1 from public.user_profiles up
      where up.user_id = auth.uid() and up.role = 'admin'
    )
  );
drop policy if exists "post_comments_insert_own" on public.post_comments;
create policy "post_comments_insert_own" on public.post_comments
  for insert to authenticated with check (
    user_id = auth.uid()
    and (
      public.is_premium(auth.uid())
      or exists (
        select 1 from public.user_profiles up
        where up.user_id = auth.uid()
          and (up.role = 'admin' or up.account_type in ('bot', 'platform'))
      )
    )
  );
drop policy if exists "post_comments_update_own" on public.post_comments;
create policy "post_comments_update_own" on public.post_comments
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "post_comments_delete_own" on public.post_comments;
create policy "post_comments_delete_own" on public.post_comments
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 9) Realtime
-- ---------------------------------------------------------------------------
do $$ begin alter publication supabase_realtime add table public.community_posts;
exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.post_likes;
exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.post_comments;
exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.follows;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 10) Contas bot (seed da comunidade)
-- ---------------------------------------------------------------------------
do $$
declare
  v_bots jsonb := '[
    {"id":"22222222-2222-2222-2222-222222222201","name":"Ana Traders","verified":true},
    {"id":"22222222-2222-2222-2222-222222222202","name":"Mercado Angola","verified":true},
    {"id":"22222222-2222-2222-2222-222222222203","name":"Joao Pips","verified":false},
    {"id":"22222222-2222-2222-2222-222222222204","name":"Crypto Wes","verified":false}
  ]'::jsonb;
  v_bot jsonb;
begin
  for v_bot in select * from jsonb_array_elements(v_bots) loop
    insert into auth.users (
      id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, role, created_at, updated_at
    ) values (
      (v_bot ->> 'id')::uuid,
      'bot-' || (v_bot ->> 'id') || '@tmt.local',
      crypt('tmt-bot-internal-2026', gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      jsonb_build_object('full_name', v_bot ->> 'name'),
      'authenticated',
      now(), now()
    ) on conflict (id) do nothing;

    insert into public.user_profiles (user_id, display_name, account_type, is_verified, bio)
    values (
      (v_bot ->> 'id')::uuid,
      v_bot ->> 'name',
      'bot',
      coalesce((v_bot ->> 'verified')::boolean, false),
      'Conta oficial do TMT.'
    )
    on conflict (user_id) do update
      set account_type = 'bot',
          is_verified  = coalesce((v_bot ->> 'verified')::boolean, false);
  end loop;
exception when others then
  raise notice 'community_social: seed de bots ignorado (%).', sqlerrm;
end $$;

-- TMT Bot passa a ser conta de plataforma/verificada.
update public.user_profiles
  set account_type = 'platform', is_verified = true
  where user_id = '11111111-1111-1111-1111-111111111111';
