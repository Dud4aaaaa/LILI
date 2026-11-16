-- =========================================================
-- LILI — indexação da busca de livros
-- Cole tudo no SQL Editor do Supabase e clique em "Run".
-- Pode rodar mais de uma vez sem problema.
--
-- O que faz:
--   * busca sem acento e sem diferença de maiúsculas ("sertao" acha "Sertão")
--   * tolera erro de digitação ("dom casmuro" acha "Dom Casmurro")
--   * usa um índice de trigramas (GIN), então continua rápida com muitos livros
--   * respeita a segurança: cada pessoa só busca nos próprios livros
-- =========================================================

-- 1. Extensões: unaccent (tirar acentos) e pg_trgm (trigramas)
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- 2. Texto "normalizado": minúsculo e sem acento.
--    Precisa ser IMMUTABLE para poder entrar no índice.
create or replace function public.lili_normalizar(texto text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(texto, '')));
$$;

-- 3. Índice de trigramas no título normalizado
create index if not exists livros_nome_trgm_idx
  on public.livros
  using gin (public.lili_normalizar(nome) extensions.gin_trgm_ops);

-- 4. Função de busca chamada pelo site
--    security invoker = roda com as permissões de quem buscou (RLS vale).
create or replace function public.buscar_livros(termo text)
returns setof public.livros
language sql
stable
security invoker
set search_path = ''
set pg_trgm.word_similarity_threshold = '0.45'
as $$
  with t as (
    select public.lili_normalizar(trim(termo)) as q
  ),
  -- o termo escapado para o LIKE (para % e _ digitados serem letras comuns)
  e as (
    select q, replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_') as qlike from t
  )
  select l.*
  from public.livros l, e
  where l.user_id = auth.uid()
    and char_length(e.q) > 0
    and (
      public.lili_normalizar(l.nome) like '%' || e.qlike || '%'          -- contém o trecho
      or e.q operator(extensions.<%) public.lili_normalizar(l.nome)      -- parecido (erro de digitação)
    )
  order by
    (public.lili_normalizar(l.nome) like e.qlike || '%') desc,          -- começa com o termo
    (public.lili_normalizar(l.nome) like '%' || e.qlike || '%') desc,   -- contém o termo
    extensions.word_similarity(e.q, public.lili_normalizar(l.nome)) desc,
    l.data desc
  limit 100;
$$;

revoke all on function public.buscar_livros(text) from public, anon;
grant execute on function public.buscar_livros(text) to authenticated;
grant execute on function public.lili_normalizar(text) to authenticated;
