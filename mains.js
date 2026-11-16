// =========================================================
// LILI — sua biblioteca de livros lidos
// Com o Supabase configurado (config.js): livros na conta de cada pessoa.
// Sem configuração: livros só neste navegador (localStorage).
// =========================================================

let livros = [];
let usuario = null; // conta logada (modo nuvem)

function lerLocal() {
    try {
        return JSON.parse(localStorage.getItem("livros")) || [];
    } catch (e) {
        return [];
    }
}

// Cópia no navegador: no modo sem conta é o próprio armazenamento;
// no modo nuvem serve só para os números da página inicial.
function salvarNoNavegador() {
    try {
        localStorage.setItem("livros", JSON.stringify(livros));
    } catch (e) {
        // Navegador sem armazenamento (ex.: janela anônima bloqueada)
    }
}

function nuvem() {
    return Boolean(window.LiliAuth && window.LiliAuth.cliente && usuario);
}

// Linha do banco -> livro da tela
function doBanco(l) {
    return { id: l.id, nome: l.nome, data: l.data, avaliacao: String(l.avaliacao), opiniao: l.opiniao || "" };
}

// ---------- BANCO (Supabase) ----------
const Banco = {
    async listar() {
        const { data, error } = await LiliAuth.cliente
            .from("livros")
            .select("id, nome, data, avaliacao, opiniao")
            .order("data", { ascending: false });
        if (error) throw error;
        return data.map(doBanco);
    },
    async inserir(livro) {
        const { data, error } = await LiliAuth.cliente
            .from("livros")
            .insert({ nome: livro.nome, data: livro.data, avaliacao: Number(livro.avaliacao), opiniao: livro.opiniao })
            .select("id, nome, data, avaliacao, opiniao")
            .single();
        if (error) throw error;
        return doBanco(data);
    },
    async inserirVarios(lista) {
        const { error } = await LiliAuth.cliente.from("livros").insert(lista.map(function (l) {
            return { nome: l.nome, data: l.data, avaliacao: Number(l.avaliacao), opiniao: l.opiniao || "" };
        }));
        if (error) throw error;
    },
    async apagar(id) {
        const { error } = await LiliAuth.cliente.from("livros").delete().eq("id", id);
        if (error) throw error;
    }
};

// No primeiro login neste navegador, leva os livros que estavam
// só no navegador para a conta (sem repetir os que já estão lá).
async function importarLivrosDoNavegador() {
    const marca = "lili-importado-" + usuario.id;
    if (localStorage.getItem(marca)) return 0;
    const locais = lerLocal().filter(function (l) {
        return l && l.nome && l.data && !l.id && !livros.some(function (n) { return n.nome === l.nome && n.data === l.data; });
    });
    if (locais.length) {
        await Banco.inserirVarios(locais);
        livros = await Banco.listar();
    }
    localStorage.setItem(marca, "1");
    return locais.length;
}

// Cores das "capas" (escolhidas pelo nome do livro, sempre a mesma para o mesmo título)
const CORES_CAPA = ["#256f82", "#1f2a2e", "#a8553a", "#5f6b3a", "#7a6a55", "#2e4a6b", "#8c3b3b", "#3f6f5a"];

function corDoLivro(nome) {
    let soma = 0;
    for (let i = 0; i < nome.length; i++) {
        soma = (soma * 31 + nome.charCodeAt(i)) >>> 0;
    }
    return CORES_CAPA[soma % CORES_CAPA.length];
}

function mostrarErro(idErro, texto, campo) {
    const erro = document.getElementById(idErro);
    if (erro) erro.textContent = texto;
    if (campo) campo.setAttribute("aria-invalid", texto ? "true" : "false");
}


// ---------- ABRIR AVALIAÇÃO ----------
function abrirAvaliacao() {
    const campo = document.getElementById("livro");
    const nome = campo.value.trim();

    if (nome === "") {
        mostrarErro("erroLivro", "Digite o nome de um livro.", campo);
        campo.focus();
        return;
    }
    mostrarErro("erroLivro", "", campo);

    document.getElementById("nomeLivro").textContent = nome;

    // Data de hoje já preenchida
    const hoje = new Date();
    const dataCampo = document.getElementById("dataLeitura");
    if (!dataCampo.value) {
        dataCampo.value = hoje.getFullYear() + "-" +
            String(hoje.getMonth() + 1).padStart(2, "0") + "-" +
            String(hoje.getDate()).padStart(2, "0");
    }

    abrirModal("modal");
    dataCampo.focus();
}


// ---------- FECHAR AVALIAÇÃO ----------
function fecharAvaliacao() {
    fecharModal("modal");
    mostrarErro("erroModal", "");
}


// ---------- SALVAR LIVRO ----------
async function salvarLivro() {
    const nome = document.getElementById("livro").value.trim();
    const data = document.getElementById("dataLeitura").value;
    const marcada = document.querySelector('input[name="avaliacao"]:checked');
    const avaliacao = marcada ? marcada.value : "";
    const opiniao = document.getElementById("opiniao").value.trim();

    if (nome === "" || data === "" || avaliacao === "") {
        mostrarErro("erroModal", "Escolha a data e a nota antes de salvar.");
        return;
    }

    let novo = { nome: nome, data: data, avaliacao: avaliacao, opiniao: opiniao };

    if (nuvem()) {
        const botao = document.querySelector("#formAvaliacao .botao-principal");
        botao.disabled = true;
        botao.textContent = "Salvando…";
        try {
            novo = await Banco.inserir(novo);
        } catch (erro) {
            mostrarErro("erroModal", LiliAuth.traduzirErro(erro));
            return;
        } finally {
            botao.disabled = false;
            botao.textContent = "Salvar livro";
        }
    }

    livros.push(novo);

    ordenarLivros();
    salvarNoNavegador();
    mostrarLivros();
    fecharAvaliacao();

    // LIMPAR OS CAMPOS
    document.getElementById("livro").value = "";
    document.getElementById("dataLeitura").value = "";
    if (marcada) marcada.checked = false;
    document.getElementById("opiniao").value = "";
    document.getElementById("livro").focus();
    mostrarAviso("“" + nome + "” foi para a estante!");
}


// ---------- ORDENAR LIVROS PELA DATA ----------
function ordenarLivros() {
    livros.sort(function (a, b) {
        return new Date(b.data) - new Date(a.data);
    });
}


// ---------- NÚMEROS DO TOPO ----------
function atualizarNumeros() {
    const total = document.getElementById("totalLivros");
    if (!total) return;

    total.textContent = livros.length;

    const media = livros.length
        ? livros.reduce((s, l) => s + Number(l.avaliacao), 0) / livros.length
        : 0;
    document.getElementById("mediaNotas").textContent =
        livros.length ? media.toFixed(1).replace(".", ",") + " ★" : "–";

    const ano = String(new Date().getFullYear());
    document.getElementById("livrosAno").textContent =
        livros.filter(l => l.data.startsWith(ano)).length;
}


// ---------- MOSTRAR OS LIVROS ----------
function mostrarLivros() {
    const lista = document.getElementById("listaLivros");
    if (!lista) return;

    const buscaCampo = document.getElementById("busca");
    const termo = buscaCampo ? buscaCampo.value.trim().toLowerCase() : "";
    const visiveis = livros.filter(l => l.nome.toLowerCase().includes(termo));

    lista.innerHTML = "";

    visiveis.forEach(function (livro) {
        const estrelas = "★".repeat(Number(livro.avaliacao)) + "☆".repeat(5 - Number(livro.avaliacao));

        const card = document.createElement("article");
        card.classList.add("card-livro");

        // Botão que abre a opinião
        const conteudo = document.createElement("button");
        conteudo.type = "button";
        conteudo.classList.add("conteudo-livro");
        conteudo.setAttribute("aria-label", livro.nome + ", " + livro.avaliacao + " de 5 estrelas. Ver opinião");

        const capa = document.createElement("div");
        capa.classList.add("capa");
        capa.style.setProperty("--cor", corDoLivro(livro.nome));

        const titulo = document.createElement("h3");
        titulo.textContent = livro.nome;
        capa.appendChild(titulo);

        const info = document.createElement("div");
        info.classList.add("info");

        const nota = document.createElement("p");
        nota.classList.add("nota");
        nota.textContent = estrelas;

        const data = document.createElement("p");
        data.classList.add("data");
        data.textContent = "Lido em " + formatarData(livro.data);

        info.appendChild(nota);
        info.appendChild(data);
        conteudo.appendChild(capa);
        conteudo.appendChild(info);

        conteudo.onclick = function () {
            abrirComentario(livro);
        };

        // Botão X
        const botaoExcluir = document.createElement("button");
        botaoExcluir.type = "button";
        botaoExcluir.classList.add("botao-excluir");
        botaoExcluir.innerHTML = '<span aria-hidden="true">✕</span>';
        botaoExcluir.setAttribute("aria-label", "Excluir " + livro.nome);
        botaoExcluir.onclick = function () {
            excluirLivro(livros.indexOf(livro));
        };

        card.appendChild(conteudo);
        card.appendChild(botaoExcluir);
        lista.appendChild(card);
    });

    // Mensagem quando não há livros
    const vazio = document.getElementById("vazio");
    if (vazio) {
        const vazioTexto = document.getElementById("vazioTexto");
        const vazioLili = document.getElementById("vazioLili");
        if (livros.length === 0) {
            vazioTexto.textContent = "Sua estante está vazia. Adicione o último livro que você terminou.";
            vazioLili.src = "assets/img/lili/lili-sono.png";
            vazio.hidden = false;
        } else if (visiveis.length === 0) {
            vazioTexto.textContent = "Nenhum livro com “" + termo + "” na estante.";
            vazioLili.src = "assets/img/lili/lili-duvida.png";
            vazio.hidden = false;
        } else {
            vazio.hidden = true;
        }
    }

    atualizarNumeros();
}


// ---------- EXCLUIR ----------
async function excluirLivro(indice) {
    if (indice < 0) return;
    const livro = livros[indice];

    if (!confirm("Tem certeza que deseja excluir o livro '" + livro.nome + "'?")) return;

    if (nuvem()) {
        try {
            await Banco.apagar(livro.id);
        } catch (erro) {
            mostrarAviso(LiliAuth.traduzirErro(erro));
            return;
        }
    }

    livros.splice(livros.indexOf(livro), 1);
    salvarNoNavegador();
    mostrarLivros();
}


// Lili reage à nota do livro
const POSE_POR_NOTA = { "5": "apaixonado", "4": "piscada", "3": "duvida", "2": "triste", "1": "bravo" };

// Aviso rápido do Lili
let avisoTempo;
function mostrarAviso(texto) {
    const aviso = document.getElementById("aviso");
    if (!aviso) return;
    document.getElementById("avisoTexto").textContent = texto;
    aviso.classList.add("visivel");
    clearTimeout(avisoTempo);
    avisoTempo = setTimeout(function () { aviso.classList.remove("visivel"); }, 3200);
}

// ---------- ABRIR COMENTÁRIO ----------
function abrirComentario(livro) {
    document.getElementById("tituloComentario").textContent = livro.nome;
    document.getElementById("dataComentario").textContent = "Lido em " + formatarData(livro.data);
    document.getElementById("estrelasComentario").textContent =
        "★".repeat(Number(livro.avaliacao)) + "☆".repeat(5 - Number(livro.avaliacao));
    document.getElementById("textoComentario").textContent =
        livro.opiniao || "Nenhuma opinião registrada.";

    document.getElementById("liliComentario").src =
        "assets/img/lili/lili-" + (POSE_POR_NOTA[livro.avaliacao] || "piscada") + ".png";

    abrirModal("modalComentario");
}


// ---------- FECHAR COMENTÁRIO ----------
function fecharComentario() {
    fecharModal("modalComentario");
}


// ---------- MODAIS (abrir, fechar, Esc, clique fora) ----------
let focoAnterior = null;

function abrirModal(id) {
    focoAnterior = document.activeElement;
    const fundo = document.getElementById(id);
    fundo.classList.add("aberto");
    const primeiro = fundo.querySelector("input, textarea, button");
    if (primeiro) primeiro.focus();
}

function fecharModal(id) {
    document.getElementById(id).classList.remove("aberto");
    if (focoAnterior && focoAnterior.focus) focoAnterior.focus();
}

function iniciarModais() {
    document.querySelectorAll(".fundo-modal").forEach(function (fundo) {
        fundo.addEventListener("click", function (event) {
            if (event.target === fundo) fecharModal(fundo.id);
        });
    });

    document.addEventListener("keydown", function (event) {
        if (event.key !== "Escape") return;
        const aberto = document.querySelector(".fundo-modal.aberto");
        if (aberto) fecharModal(aberto.id);
    });
}


// ---------- FORMATAR DATA ----------
function formatarData(data) {
    const partes = data.split("-");
    return partes[2] + "/" + partes[1] + "/" + partes[0];
}


// ---------- INICIAR ----------
document.addEventListener("DOMContentLoaded", async function () {
    const formInserir = document.getElementById("formInserir");
    if (!formInserir) return;

    formInserir.addEventListener("submit", function (event) {
        event.preventDefault();
        abrirAvaliacao();
    });

    document.getElementById("formAvaliacao").addEventListener("submit", function (event) {
        event.preventDefault();
        salvarLivro();
    });

    document.getElementById("busca").addEventListener("input", mostrarLivros);

    iniciarModais();

    const auth = window.LiliAuth;
    const sair = document.getElementById("sair");

    // ---------- Sem Supabase configurado: livros só neste navegador ----------
    if (!auth || !auth.cliente) {
        sair.textContent = "Início";
        sair.addEventListener("click", function () { window.location.href = "index.html"; });
        document.getElementById("emailUsuario").textContent = "Sem conta: livros só neste navegador";
        livros = lerLocal();
        ordenarLivros();
        mostrarLivros();
        return;
    }

    // ---------- Com conta ----------
    const sessao = await auth.exigirLogin();
    if (!sessao) return; // foi para o login
    usuario = sessao.user;
    document.getElementById("emailUsuario").textContent = usuario.email || "";

    sair.addEventListener("click", async function () {
        await auth.cliente.auth.signOut();
        try { localStorage.removeItem("livros"); } catch (e) { }
        window.location.replace("main.html");
    });

    // Se a sessão acabar em outra aba, volta para o login
    auth.cliente.auth.onAuthStateChange(function (evento) {
        if (evento === "SIGNED_OUT") window.location.replace("main.html");
    });

    const lista = document.getElementById("listaLivros");
    lista.classList.add("carregando");
    try {
        livros = await Banco.listar();
        const importados = await importarLivrosDoNavegador();
        if (importados) mostrarAviso(importados + (importados === 1 ? " livro deste navegador foi" : " livros deste navegador foram") + " para a sua conta!");
    } catch (erro) {
        mostrarAviso(auth.traduzirErro(erro));
    }
    lista.classList.remove("carregando");
    salvarNoNavegador();
    ordenarLivros();
    mostrarLivros();
});
