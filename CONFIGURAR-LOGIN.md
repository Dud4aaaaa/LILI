# Como ligar o login e o banco do LILI (Supabase)

Enquanto `config.js` estiver vazio, o site funciona **sem conta**: os livros ficam só no navegador.
Depois destes passos, cada pessoa tem a sua conta e os livros ficam guardados no Supabase.

## 1. Criar o projeto no Supabase

1. Entre em <https://supabase.com> e crie uma conta (pode ser com o GitHub ou com e-mail).
2. Clique em **New project**, dê o nome `lili`, escolha uma senha para o banco (guarde-a) e a região **South America (São Paulo)**.
3. Espere uns 2 minutos até o projeto ficar pronto.

## 2. Criar a tabela dos livros

1. No menu da esquerda, abra **SQL Editor** → **New query**.
2. Copie todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql), cole e clique em **Run**.
3. Ele cria a tabela `livros` e as regras de segurança: cada pessoa só vê e mexe nos próprios livros.

## 3. Ligar o site ao projeto

1. Abra **Project Settings** → **API** (ou **Data API**).
2. Copie o **Project URL** e a chave **anon public**.
3. Cole as duas em [`config.js`](config.js):

   ```js
   window.LILI_CONFIG = {
     supabaseUrl: "https://SEU-PROJETO.supabase.co",
     supabaseAnonKey: "eyJhbGciOi..."
   };
   ```

   A chave `anon` pode ficar no site, porque ela é pública. **Nunca** use a chave `service_role` aqui.

## 4. Endereços permitidos (e-mails e Google voltam para o site)

Em **Authentication** → **URL Configuration**:

- **Site URL:** o endereço onde o site roda. No seu computador é `http://localhost:5500`.
- **Redirect URLs:** adicione
  - `http://localhost:5500/LILI.html`
  - `http://localhost:5500/nova-senha.html`
  - e os mesmos endereços com o domínio de verdade quando o site for publicado.

> O site precisa ser aberto por um servidor (`http://localhost:5500`), não clicando duas vezes no arquivo (`file://`).
> Para isso, abra um terminal na pasta do projeto e rode:
>
> ```bash
> npx http-server@14.1.1 -p 5500 -c-1
> ```

## 5. E-mail e senha

Já vem ligado no Supabase (**Authentication** → **Providers** → **Email**).

- Com **Confirm email** ligado (o padrão), quem cria uma conta recebe um e-mail para confirmar antes de entrar.
- O servidor de e-mail grátis do Supabase manda poucos e-mails por hora. Para uso real, configure um SMTP próprio em **Authentication** → **SMTP Settings**.

## 6. Entrar com Google

1. Entre em <https://console.cloud.google.com>, crie um projeto (ex.: `lili`).
2. Em **APIs e serviços** → **Tela de consentimento OAuth**: tipo **Externo**, nome do app `LILI` e o seu e-mail de suporte.
3. Em **Credenciais** → **Criar credenciais** → **ID do cliente OAuth** → tipo **Aplicativo da Web**:
   - **Origens JavaScript autorizadas:** `http://localhost:5500`
   - **URIs de redirecionamento autorizados:** `https://SEU-PROJETO.supabase.co/auth/v1/callback`
     (o endereço exato aparece no Supabase, na tela do provedor Google).
4. Copie o **ID do cliente** e a **Chave secreta do cliente**.
5. No Supabase: **Authentication** → **Providers** → **Google** → ative e cole o ID e a chave secreta → **Save**.

## 7. Testar

1. Abra `http://localhost:5500/main.html`.
2. Aba **Criar conta** → e-mail e senha → confirme pelo e-mail → entre.
3. Adicione um livro: ele aparece em **Table Editor** → `livros` no Supabase.
4. Teste **Entrar com Google** e **Esqueci a senha**.

Se você já tinha livros salvos no navegador, eles vão sozinhos para a conta no primeiro login.
