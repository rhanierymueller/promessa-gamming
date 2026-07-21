-- Exclusão de conta pelo próprio usuário (LGPD): apaga os dados dele e o
-- usuário do Auth. Só funciona autenticado e só sobre si mesmo.

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  delete from public.weekly_scores where player_id = auth.uid();
  delete from public.league_members where player_id = auth.uid();
  -- ligas criadas pelo usuário caem junto (membros/pontuações em cascata)
  delete from public.leagues where created_by = auth.uid();
  delete from public.profiles where id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_account() from public;
grant execute on function public.delete_account() to authenticated;
