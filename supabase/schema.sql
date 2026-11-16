-- =========================================================
-- LILI — banco de dados (Supabase / Postgres)
-- Cole tudo no SQL Editor do seu projeto Supabase e clique em "Run".
-- =========================================================

-- Tabela dos livros lidos. Cada livro pertence a uma conta (user_id).
create table if not exists public.livros (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome        text not null check (char_length(nome) between 1 and 300),
  data        date not null,
  avaliacao   smallint not null check (avaliacao between 1 and 5),
  opiniao     text not null default '' check (char_length(opiniao) <= 5000),
  criado_em   timestamptz not null default now()
);

create index if not exists livros_user_data_idx on public.livros (user_id, data desc);

-- Segurança: cada pessoa só vê, cria, muda e apaga os PRÓPRIOS livros.
alter table public.livros enable row level security;

drop policy if exists "ver os meus livros" on public.livros;
create policy "ver os meus livros" on public.livros
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "criar os meus livros" on public.livros;
create policy "criar os meus livros" on public.livros
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "mudar os meus livros" on public.livros;
create policy "mudar os meus livros" on public.livros
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "apagar os meus livros" on public.livros;
create policy "apagar os meus livros" on public.livros
  for delete to authenticated using (auth.uid() = user_id);
