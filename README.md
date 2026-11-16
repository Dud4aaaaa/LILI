# LILI

Biblioteca online de livros lidos: registre o título, a data em que terminou, a nota de 1 a 5 estrelas e a sua opinião.

- `index.html` — página inicial
- `main.html` — login (e-mail e senha, Google, esqueci a senha)
- `LILI.html` — a sua estante
- `nova-senha.html` — criar nova senha pelo link do e-mail

Feito em HTML, CSS e JavaScript, sem etapa de build. Login e banco de dados no [Supabase](https://supabase.com).

## Rodar no computador

```bash
npx.cmd -y http-server@14.1.1 -p 5500 -c-1
```

Depois abra <http://localhost:5500>.

## Configurar o login e o banco

Siga [CONFIGURAR-LOGIN.md](CONFIGURAR-LOGIN.md). A tabela e as regras de segurança estão em [supabase/schema.sql](supabase/schema.sql).

A chave em `config.js` é a chave **publicável** do Supabase: ela é feita para ficar no site. A proteção dos dados vem das regras (RLS) do banco. Nunca coloque a chave secreta (`service_role` / `sb_secret_...`) no repositório.
