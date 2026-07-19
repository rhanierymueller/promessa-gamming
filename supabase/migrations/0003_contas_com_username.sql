-- Contas com nome de usuário ÚNICO (cadastro com e-mail + senha).
-- O e-mail/senha ficam no Supabase Auth; aqui só o username público.

alter table public.profiles
  add column if not exists username text;

-- unicidade sem diferenciar maiúsculas ("Craque10" = "craque10")
create unique index if not exists profiles_username_unique
  on public.profiles (lower(username))
  where username is not null;

-- Reivindica um username para o usuário logado; erro amigável se já existir.
create or replace function public.claim_username(p_username text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
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

revoke all on function public.claim_username(text) from public;
grant execute on function public.claim_username(text) to authenticated;
