// =========================================================
// LILI — página de login (main.html)
// Entrar, criar conta, entrar com Google, esqueci a senha.
// =========================================================
document.addEventListener("DOMContentLoaded", async function () {
    const auth = window.LiliAuth;
    const $ = (id) => document.getElementById(id);

    const form = $("formLogin");
    const email = $("email");
    const senha = $("senha");
    const senha2 = $("senha2");
    const botaoEnviar = $("botaoEnviar");
    const botaoGoogle = $("botaoGoogle");
    const mensagem = $("mensagem");
    let modo = "entrar"; // ou "criar"

    function erroCampo(idErro, texto, campo) {
        $(idErro).textContent = texto;
        if (campo) campo.setAttribute("aria-invalid", texto ? "true" : "false");
    }

    function avisar(texto, tipo) {
        mensagem.textContent = texto;
        mensagem.className = "mensagem" + (tipo ? " mensagem-" + tipo : "");
        mensagem.hidden = !texto;
    }

    function ocupado(sim) {
        botaoEnviar.disabled = sim;
        botaoGoogle.disabled = sim;
        botaoEnviar.textContent = sim ? "Um momento…" : (modo === "entrar" ? "Entrar na biblioteca" : "Criar minha conta");
    }

    // ---------- Sem configuração: avisa e deixa usar sem conta ----------
    if (!auth || !auth.cliente) {
        $("semConta").hidden = false;
        form.querySelectorAll("input, button").forEach((el) => (el.disabled = true));
        botaoGoogle.disabled = true;
        document.querySelectorAll(".aba").forEach((el) => (el.disabled = true));
        return;
    }

    // Já está logado? Vai direto para a estante
    if (await auth.sessao()) {
        window.location.replace("LILI.html");
        return;
    }

    // ---------- Abas ----------
    function trocarModo(novo) {
        modo = novo;
        $("abaEntrar").setAttribute("aria-pressed", String(modo === "entrar"));
        $("abaCriar").setAttribute("aria-pressed", String(modo === "criar"));
        $("campoConfirmar").hidden = modo !== "criar";
        $("esqueci").hidden = modo !== "entrar";
        senha.autocomplete = modo === "entrar" ? "current-password" : "new-password";
        senha.placeholder = modo === "entrar" ? "Sua senha" : "Pelo menos 6 caracteres";
        $("textoGoogle").textContent = modo === "entrar" ? "Entrar com Google" : "Criar conta com Google";
        avisar("");
        ["erroEmail", "erroSenha", "erroSenha2"].forEach((id) => ($(id).textContent = ""));
        ocupado(false);
    }
    $("abaEntrar").addEventListener("click", () => trocarModo("entrar"));
    $("abaCriar").addEventListener("click", () => trocarModo("criar"));

    // ---------- Validação ----------
    function validar() {
        let ok = true;
        if (!email.value.trim() || !email.checkValidity()) {
            erroCampo("erroEmail", "Digite um e-mail válido.", email); ok = false;
        } else erroCampo("erroEmail", "", email);

        if (senha.value.length < 6) {
            erroCampo("erroSenha", modo === "entrar" ? "Digite sua senha." : "A senha precisa ter pelo menos 6 caracteres.", senha); ok = false;
        } else erroCampo("erroSenha", "", senha);

        if (modo === "criar") {
            if (senha2.value !== senha.value) {
                erroCampo("erroSenha2", "As duas senhas não são iguais.", senha2); ok = false;
            } else erroCampo("erroSenha2", "", senha2);
        }
        return ok;
    }

    // ---------- Entrar / Criar conta ----------
    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        avisar("");
        if (!validar()) return;
        ocupado(true);

        try {
            if (modo === "entrar") {
                const { error } = await auth.cliente.auth.signInWithPassword({
                    email: email.value.trim(),
                    password: senha.value
                });
                if (error) throw error;
                window.location.replace("LILI.html");
                return;
            }

            const { data, error } = await auth.cliente.auth.signUp({
                email: email.value.trim(),
                password: senha.value,
                options: { emailRedirectTo: auth.url("LILI.html") }
            });
            if (error) throw error;

            if (data.session) {
                window.location.replace("LILI.html");
                return;
            }
            // Supabase pede confirmação por e-mail
            avisar("Conta criada! Enviamos um link para " + email.value.trim() + ". Abra o e-mail e confirme para entrar.", "ok");
            senha.value = ""; senha2.value = "";
        } catch (erro) {
            avisar(auth.traduzirErro(erro), "erro");
        }
        ocupado(false);
    });

    // ---------- Google ----------
    botaoGoogle.addEventListener("click", async function () {
        avisar("");
        ocupado(true);
        const { error } = await auth.cliente.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: auth.url("LILI.html") }
        });
        if (error) {
            avisar(auth.traduzirErro(error), "erro");
            ocupado(false);
        }
        // sem erro: o navegador vai para a página do Google
    });

    // ---------- Esqueci a senha ----------
    $("esqueci").addEventListener("click", async function () {
        avisar("");
        if (!email.value.trim() || !email.checkValidity()) {
            erroCampo("erroEmail", "Digite seu e-mail acima para receber o link de nova senha.", email);
            email.focus();
            return;
        }
        erroCampo("erroEmail", "", email);
        ocupado(true);
        const { error } = await auth.cliente.auth.resetPasswordForEmail(email.value.trim(), {
            redirectTo: auth.url("nova-senha.html")
        });
        ocupado(false);
        if (error) avisar(auth.traduzirErro(error), "erro");
        else avisar("Se existir uma conta com esse e-mail, você vai receber um link para criar uma nova senha.", "ok");
    });
});
