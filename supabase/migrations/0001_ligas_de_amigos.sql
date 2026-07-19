-- Promessa · Fase 3: ligas assíncronas por código de convite + ranking semanal
-- Colar no SQL Editor do Supabase e Run. Seguro re-rodar? NÃO (criações);
-- rodar uma única vez.

-- ============ TABELAS ============

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 16),
  club_name text not null default '' check (char_length(club_name) <= 24),
  created_at timestamptz not null default now()
);

create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z2-9]{6}$'),
  name text not null check (char_length(name) between 1 and 24),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.league_members (
  league_id uuid not null references public.leagues (id) on delete cascade,
  player_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (league_id, player_id)
);

create table public.weekly_scores (
  player_id uuid not null references public.profiles (id) on delete cascade,
  week text not null check (week ~ '^\d{4}-W\d{2}$'),
  points int not null default 0 check (points between 0 and 100000),
  matches int not null default 0 check (matches between 0 and 10000),
  updated_at timestamptz not null default now(),
  primary key (player_id, week)
);

-- ============ RLS ============

alter table public.profiles enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.weekly_scores enable row level security;

-- perfis: todos os logados leem (nomes no ranking); cada um escreve só o seu
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid());

-- ligas: só MEMBROS leem (o código de convite é o segredo — nunca listável)
create policy "leagues_select_member" on public.leagues
  for select to authenticated
  using (exists (
    select 1 from public.league_members m
    where m.league_id = id and m.player_id = auth.uid()
  ));

-- membros: leio as filiações das MINHAS ligas
create policy "members_select_same_league" on public.league_members
  for select to authenticated
  using (exists (
    select 1 from public.league_members mine
    where mine.league_id = league_id and mine.player_id = auth.uid()
  ));

-- pontos: todos os logados leem (ranking); escrita só via RPC
create policy "scores_select" on public.weekly_scores
  for select to authenticated using (true);

-- criar/entrar em liga e pontuar passam pelas FUNÇÕES abaixo (security definer)

-- ============ RPCs ============

-- semana ISO corrente, ex.: 2026-W29
create or replace function public.current_week()
returns text language sql stable as $$
  select to_char(now(), 'IYYY-"W"IW')
$$;

create or replace function public.create_league(p_name text)
returns public.leagues
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  v_league public.leagues;
begin
  if auth.uid() is null then raise exception 'não autenticado'; end if;
  if char_length(trim(p_name)) not between 1 and 24 then
    raise exception 'nome de liga inválido';
  end if;
  -- código de 6 chars sem ambíguos (sem 0/O/1/I)
  loop
    v_code := (
      select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
      from generate_series(1, 6)
    );
    exit when not exists (select 1 from leagues where code = v_code);
  end loop;
  insert into leagues (code, name, created_by)
  values (v_code, trim(p_name), auth.uid())
  returning * into v_league;
  insert into league_members (league_id, player_id) values (v_league.id, auth.uid());
  return v_league;
end $$;

create or replace function public.join_league(p_code text)
returns public.leagues
language plpgsql security definer set search_path = public as $$
declare
  v_league public.leagues;
begin
  if auth.uid() is null then raise exception 'não autenticado'; end if;
  select * into v_league from leagues where code = upper(trim(p_code));
  if not found then raise exception 'código não encontrado'; end if;
  insert into league_members (league_id, player_id)
  values (v_league.id, auth.uid())
  on conflict do nothing;
  return v_league;
end $$;

create or replace function public.add_weekly_points(p_points int, p_matches int default 1)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'não autenticado'; end if;
  if p_points not between 0 and 50 or p_matches not between 0 and 5 then
    raise exception 'pontuação inválida';
  end if;
  insert into weekly_scores (player_id, week, points, matches)
  values (auth.uid(), current_week(), p_points, p_matches)
  on conflict (player_id, week)
  do update set
    points = weekly_scores.points + excluded.points,
    matches = weekly_scores.matches + excluded.matches,
    updated_at = now();
end $$;
