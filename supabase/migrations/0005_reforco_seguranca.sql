-- Reforço de segurança (auditoria): privilégio mínimo nas RPCs, teto semanal
-- anti-farm no ranking, leitura de perfis/pontos restrita a colegas de liga,
-- formato de username garantido no banco e username só para conta de verdade.
-- Colar no SQL Editor do Supabase e Run. Seguro re-rodar: SIM.
--
-- PRÉ-REQUISITO: rodar 0003 e 0004 ANTES desta. Em 24/07/2026 o banco de
-- produção tinha só 0001 e 0002 aplicadas — sem a coluna profiles.username
-- (0003) o bloco 4 aqui falha. Confira antes de rodar:
--   select to_regclass('public.profiles'),
--          to_regproc('public.claim_username(text)'),  -- 0003
--          to_regproc('public.delete_account()');      -- 0004
-- Se algum vier nulo, aplique a migration correspondente primeiro.

-- ============ 1) RPCs: revogar o EXECUTE herdado de PUBLIC ============
-- (no Postgres, função nova nasce executável por PUBLIC — inclui o role anon)

revoke all on function public.current_week() from public, anon;
revoke all on function public.create_league(text) from public, anon;
revoke all on function public.join_league(text) from public, anon;
revoke all on function public.add_weekly_points(int, int) from public, anon;
revoke all on function public.is_league_member(uuid) from public, anon;

grant execute on function public.current_week() to authenticated;
grant execute on function public.create_league(text) to authenticated;
grant execute on function public.join_league(text) to authenticated;
grant execute on function public.add_weekly_points(int, int) to authenticated;
grant execute on function public.is_league_member(uuid) to authenticated;

-- ============ 2) Ranking: teto semanal anti-farm ============
-- Cada chamada continua limitada (0-50 pts, 0-5 partidas). Sem teto semanal,
-- um script chamando a RPC em loop zerava o ranking. 100 partidas/semana
-- (~14 por dia) é folgado para humano e corta o farm em escala.

create or replace function public.add_weekly_points(p_points int, p_matches int default 1)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_points int;
  v_matches int;
begin
  if auth.uid() is null then raise exception 'não autenticado'; end if;
  if p_points not between 0 and 50 or p_matches not between 0 and 5 then
    raise exception 'pontuação inválida';
  end if;
  -- soma primeiro e confere depois: o ON CONFLICT serializa na trava da linha,
  -- então duas chamadas simultâneas não furam o teto (ler antes de somar furaria).
  -- O raise aborta a transação e desfaz o insert.
  insert into weekly_scores (player_id, week, points, matches)
  values (auth.uid(), current_week(), p_points, p_matches)
  on conflict (player_id, week)
  do update set
    points = weekly_scores.points + excluded.points,
    matches = weekly_scores.matches + excluded.matches,
    updated_at = now()
  returning points, matches into v_points, v_matches;

  if v_matches > 100 or v_points > 2000 then
    raise exception 'limite semanal do ranking atingido';
  end if;
end $$;

-- ============ 3) Perfis e pontos: leio só o meu e os de colegas de liga ============
-- Antes qualquer sessão autenticada (inclusive anônima) listava TODOS os
-- perfis e pontuações — enumeração desnecessária de usuários.

create or replace function public.shares_league_with(p_player uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from league_members mine
    join league_members theirs on theirs.league_id = mine.league_id
    where mine.player_id = auth.uid() and theirs.player_id = p_player
  );
$$;

revoke all on function public.shares_league_with(uuid) from public, anon;
grant execute on function public.shares_league_with(uuid) to authenticated;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_league_with(id));

drop policy if exists "scores_select" on public.weekly_scores;
create policy "scores_select" on public.weekly_scores
  for select to authenticated
  using (player_id = auth.uid() or public.shares_league_with(player_id));

-- ============ 4) Username: formato garantido no BANCO ============
-- O regex do claim_username podia ser contornado por UPDATE direto na
-- tabela (a política de update permite editar o próprio perfil inteiro).

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format
  check (username is null or username ~ '^[A-Za-z0-9_]{3,16}$');

-- Defesa em profundidade: escrita direta só nas colunas do jogo — username
-- passa exclusivamente pelo claim_username (security definer).
revoke insert on table public.profiles from authenticated, anon;
revoke update on table public.profiles from authenticated, anon;
grant insert (id, name, club_name) on public.profiles to authenticated;
grant update (id, name, club_name) on public.profiles to authenticated;

-- ============ 5) Username exige conta de verdade (não anônima) ============
create or replace function public.claim_username(p_username text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'conta anônima não pode reivindicar username';
  end if;
  if p_username is null or p_username !~ '^[A-Za-z0-9_]{3,16}$' then
    raise exception 'username inválido';
  end if;
  if exists (
    select 1 from public.profiles
    where lower(username) = lower(p_username) and id <> auth.uid()
  ) then
    raise exception 'username já em uso';
  end if;
  insert into public.profiles (id, name, club_name, username)
  values (auth.uid(), p_username, '', p_username)
  on conflict (id) do update set username = excluded.username;
end;
$$;

-- ============ 6) Freio por conta nas RPCs de liga (anti-flood) ============
-- Sem isso, um script cria milhares de ligas por minuto ou varre o espaço de
-- códigos de convite chamando join_league em loop. O freio é por conta e por
-- janela de tempo — generoso para humano, inviável para script.
-- Ele NÃO é absoluto: quem cria contas anônimas novas ganha cotas novas. O
-- que segura esse lado é o rate limit por IP do Supabase Auth (dashboard).

create table if not exists public.action_limits (
  player_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  window_start timestamptz not null default now(),
  count int not null default 0,
  primary key (player_id, action)
);

alter table public.action_limits enable row level security;
-- sem policy nenhuma: RLS nega tudo. Só as funções security definer entram.
revoke all on table public.action_limits from public, anon, authenticated;

/*
 * Conta uma ação na janela e estoura se passar do teto. O raise desfaz a
 * transação inteira (inclusive esta contagem), então o contador congela no
 * teto enquanto a janela durar — que é exatamente o comportamento desejado.
 */
create or replace function public.bump_action_limit(
  p_action text,
  p_max int,
  p_window interval
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  insert into action_limits (player_id, action, window_start, count)
  values (auth.uid(), p_action, now(), 1)
  on conflict (player_id, action) do update set
    window_start = case
      when action_limits.window_start < now() - p_window then now()
      else action_limits.window_start
    end,
    count = case
      when action_limits.window_start < now() - p_window then 1
      else action_limits.count + 1
    end
  returning count into v_count;

  if v_count > p_max then
    raise exception 'muitas tentativas seguidas — espere um pouco e tente de novo';
  end if;
end $$;

revoke all on function public.bump_action_limit(text, int, interval) from public, anon, authenticated;

-- criar liga: 5 por hora (humano nenhum precisa de mais)
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
  perform bump_action_limit('create_league', 5, interval '1 hour');
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

-- entrar em liga: 10 por hora. O código tem ~1 bilhão de combinações; com
-- esse teto, varrer o espaço vira inviável mesmo com muitas contas.
create or replace function public.join_league(p_code text)
returns public.leagues
language plpgsql security definer set search_path = public as $$
declare
  v_league public.leagues;
begin
  if auth.uid() is null then raise exception 'não autenticado'; end if;
  perform bump_action_limit('join_league', 10, interval '1 hour');
  select * into v_league from leagues where code = upper(trim(p_code));
  if not found then raise exception 'código não encontrado'; end if;
  insert into league_members (league_id, player_id)
  values (v_league.id, auth.uid())
  on conflict do nothing;
  return v_league;
end $$;

revoke all on function public.create_league(text) from public, anon;
revoke all on function public.join_league(text) from public, anon;
grant execute on function public.create_league(text) to authenticated;
grant execute on function public.join_league(text) to authenticated;
