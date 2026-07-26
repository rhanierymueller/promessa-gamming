-- Sincronização da carreira entre aparelhos.
--
-- Até aqui o save vivia SÓ no localStorage: entrar na mesma conta no celular
-- dava a conta, mas não a carreira, porque ela nunca era enviada a lugar nenhum.
--
-- PRÉ-REQUISITO: aplique 0003, 0004 e 0005 antes desta.
--
-- Atenção ao RLS: sessão anônima do Supabase também entra como `authenticated`,
-- então uma policy `using (true)` abriria a carreira de todo mundo para
-- qualquer visitante. Toda regra aqui compara auth.uid() com o dono da linha.

create table if not exists public.career_saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- o save inteiro, do jeito que o jogo grava no navegador
  data jsonb not null,
  -- carimbo do CLIENTE (save.savedAt): é ele que decide quem jogou por último,
  -- porque o relógio do servidor não sabe quando a partida foi jogada offline
  saved_at bigint not null,
  updated_at timestamptz not null default now()
);

alter table public.career_saves enable row level security;

drop policy if exists "dono lê a própria carreira" on public.career_saves;
create policy "dono lê a própria carreira"
  on public.career_saves for select
  using (auth.uid() = user_id);

drop policy if exists "dono cria a própria carreira" on public.career_saves;
create policy "dono cria a própria carreira"
  on public.career_saves for insert
  with check (auth.uid() = user_id);

drop policy if exists "dono atualiza a própria carreira" on public.career_saves;
create policy "dono atualiza a própria carreira"
  on public.career_saves for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "dono apaga a própria carreira" on public.career_saves;
create policy "dono apaga a própria carreira"
  on public.career_saves for delete
  using (auth.uid() = user_id);

-- exclusão de conta leva a carreira junto (LGPD): o on delete cascade acima
-- cobre a remoção via auth.users, e a policy de delete cobre o pedido do app
