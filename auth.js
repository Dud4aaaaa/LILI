// =========================================================
// LILI — conexão com o Supabase (login e banco)
// Precisa carregar antes: supabase-js (CDN) e config.js
// =========================================================
(function () {
    const cfg = window.LILI_CONFIG || {};
    const configurado = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
    const biblioteca = window.supabase && typeof window.supabase.createClient === "function";

    const cliente = configurado && biblioteca
        ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
            auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        })
        : null;

    // Endereço completo de uma página do site (para os links de e-mail e do Google)
    function url(pagina) {
        return new URL(pagina, window.location.href).href;
    }

    // Mensagens do Supabase em português
    function traduzirErro(erro) {
        const msg = (erro && (erro.message || erro.error_description || String(erro))) || "";
        const m = msg.toLowerCase();
        if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
        if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar: o link está na sua caixa de entrada.";
        if (m.includes("already registered") || m.includes("already been registered")) return "Já existe uma conta com esse e-mail. Use a aba Entrar.";
        if (m.includes("password should be at least") || m.includes("password is too short")) return "A senha precisa ter pelo menos 6 caracteres.";
        if (m.includes("weak password") || m.includes("password is known")) return "Essa senha é fácil demais de adivinhar. Escolha outra.";
        if (m.includes("rate limit") || m.includes("too many") || m.includes("security purposes")) return "Muitas tentativas seguidas. Espere um minuto e tente de novo.";
        if (m.includes("unable to validate email") || m.includes("invalid email")) return "Esse e-mail não parece válido.";
        if (m.includes("provider is not enabled") || m.includes("unsupported provider")) return "O login com Google ainda não foi ativado no Supabase.";
        if (m.includes("failed to fetch") || m.includes("network")) return "Sem conexão com o servidor. Confira sua internet.";
        if (m.includes("same password") || m.includes("different from the old")) return "A nova senha precisa ser diferente da anterior.";
        return "Não deu certo: " + msg;
    }

    async function sessao() {
        if (!cliente) return null;
        const { data } = await cliente.auth.getSession();
        return data.session;
    }

    // Na biblioteca: sem login, volta para a página de entrar
    async function exigirLogin() {
        const s = await sessao();
        if (!s) {
            window.location.replace("main.html");
            return null;
        }
        return s;
    }

    window.LiliAuth = { configurado, cliente, url, traduzirErro, sessao, exigirLogin };
})();
