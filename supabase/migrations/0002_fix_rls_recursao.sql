-- Fix: recursão infinita nas políticas de leagues/league_members.
-- A checagem "sou membro?" vira função SECURITY DEFINER (não re-dispara RLS).
-- Colar no SQL Editor e Run.

create or replace function public.is_league_member(p_league uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from league_members
    where league_id = p_league and player_id = auth.uid()
  );
$$;

drop policy "members_select_same_league" on public.league_members;
create policy "members_select_same_league" on public.league_members
  for select to authenticated
  using (public.is_league_member(league_id));

drop policy "leagues_select_member" on public.leagues;
create policy "leagues_select_member" on public.leagues
  for select to authenticated
  using (public.is_league_member(id));
