// =========================================================
// LILI — página inicial: estantes, entrada, cursor e saída
// =========================================================
(function () {
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mouse = window.matchMedia("(pointer: fine)").matches;
    const hero = document.getElementById("hero");
    if (!hero) return;

    // Começa escondido para a entrada
    if (!reduzido) document.documentElement.classList.add("pre");

    const CORES = ["#256f82", "#1f2a2e", "#a8553a", "#5f6b3a", "#7a6a55", "#2e4a6b",
        "#8c3b3b", "#3f6f5a", "#c98a1b", "#e3d6bd", "#33505a", "#6d3d2b"];

    // ---------- Sorteio repetível ----------
    function sorteador(semente) {
        let s = semente >>> 0;
        return function () {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 4294967296;
        };
    }

    // ---------- Estantes (fileiras de lombadas em loop sem emenda) ----------
    function montarFileiras() {
        const base = Math.max(window.innerWidth, 760) / 100;
        const alt = window.innerHeight / 100;

        document.querySelectorAll(".fileira").forEach(function (fileira, idx) {
            const rnd = sorteador(17 + idx * 101);
            const [hMin, hMax] = fileira.dataset.h.split(",").map(Number);
            const [wMin, wMax] = fileira.dataset.w.split(",").map(Number);
            const dur = Number(fileira.dataset.dur);
            const minimo = Number(fileira.dataset.n);

            const seq = [];
            let largura = 0;
            while (seq.length < minimo || largura < window.innerWidth * 1.15) {
                const w = (wMin + rnd() * (wMax - wMin)) * base;
                const h = (hMin + rnd() * (hMax - hMin)) * alt;
                const inclina = rnd() < 0.08 ? (3 + rnd() * 4) : 0;
                seq.push({ w, h, c: CORES[Math.floor(rnd() * CORES.length)], inclina });
                largura += w + 2 + (inclina ? 6 : 0);
            }

            const trilho = document.createElement("div");
            trilho.className = "trilho";
            trilho.style.setProperty("--dur", dur + "s");
            trilho.style.setProperty("--atraso", (-rnd() * dur).toFixed(2) + "s");

            for (let copia = 0; copia < 2; copia++) {
                seq.forEach(function (l) {
                    const el = document.createElement("span");
                    el.className = "lombada" + (l.inclina ? " inclinada" : "");
                    el.style.width = l.w.toFixed(1) + "px";
                    el.style.height = l.h.toFixed(1) + "px";
                    el.style.setProperty("--c", l.c);
                    if (l.inclina) el.style.setProperty("--inc", l.inclina.toFixed(1) + "deg");
                    trilho.appendChild(el);
                });
            }

            fileira.replaceChildren(trilho);
        });
    }

    // ---------- Grão ----------
    function montarGrao() {
        const grao = document.querySelector(".grao");
        if (!grao) return;
        const c = document.createElement("canvas");
        c.width = c.height = 180;
        const ctx = c.getContext("2d");
        const img = ctx.createImageData(180, 180);
        for (let i = 0; i < img.data.length; i += 4) {
            const v = Math.random() * 255;
            img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
            img.data[i + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
        grao.style.backgroundImage = "url(" + c.toDataURL() + ")";
    }

    // ---------- HUD com os dados reais da estante ----------
    let livros = [];
    try { livros = JSON.parse(localStorage.getItem("livros")) || []; } catch (e) { livros = []; }
    const ano = String(new Date().getFullYear());
    const totais = {
        livros: livros.length,
        ano: livros.filter(function (l) { return String(l.data || "").startsWith(ano); }).length
    };

    const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    function relogio() {
        const d = new Date();
        const el = document.querySelector("[data-relogio]");
        if (el) el.textContent = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
        const hoje = document.querySelector("[data-hoje]");
        if (hoje) hoje.textContent = d.getDate() + " " + meses[d.getMonth()];
    }
    document.querySelector("[data-ano]").textContent = ano;

    function escreverContas(fracao) {
        document.querySelectorAll("[data-conta]").forEach(function (el) {
            el.textContent = Math.round(totais[el.dataset.conta] * fracao);
        });
        document.querySelector("[data-plural]").textContent = totais.livros === 1 ? "livro" : "livros";
    }

    function contar(ms) {
        const t0 = performance.now();
        function passo(t) {
            const f = Math.min(1, (t - t0) / ms);
            escreverContas(1 - Math.pow(1 - f, 3));
            if (f < 1) requestAnimationFrame(passo);
        }
        requestAnimationFrame(passo);
    }

    // ---------- Entrada ----------
    function entrar() {
        const anims = [];
        const sai = "cubic-bezier(.16, 1, .3, 1)";
        function anima(el, quadros, dur, atraso) {
            if (!el) return;
            anims.push(el.animate(quadros, { duration: dur, delay: atraso, easing: sai, fill: "backwards" }));
        }

        document.documentElement.classList.remove("pre");

        anima(document.querySelector(".c-fundo"), [{ opacity: 0 }, { opacity: 1 }], 1400, 0);
        anima(document.querySelector(".c-longe"), [{ opacity: 0, transform: "translateY(6svh)" }, { opacity: 1, transform: "none" }], 1600, 300);
        anima(document.querySelector(".c-meio"), [{ opacity: 0, transform: "translateY(9svh)" }, { opacity: 1, transform: "none" }], 1700, 500);
        anima(document.querySelector(".c-pilha"), [{ opacity: 0, transform: "translateY(20%) scale(.94)" }, { opacity: 1, transform: "none" }], 2800, 600);
        anima(document.querySelector(".c-frente"), [{ opacity: 0, transform: "translateY(14svh)" }, { opacity: 1, transform: "none" }], 1800, 900);

        document.querySelectorAll(".nome-letras span").forEach(function (l, i) {
            anima(l, [{ transform: "translateY(105%)" }, { transform: "none" }], 900, 1500 + i * 65);
        });
        anima(document.querySelector(".asterisco"), [{ opacity: 0, transform: "rotate(-200deg) scale(.4)" }, { opacity: 1, transform: "none" }], 1300, 1850);
        document.querySelectorAll(".linha > span").forEach(function (l, i) {
            anima(l, [{ transform: "translateY(105%)" }, { transform: "none" }], 800, 2000 + i * 90);
        });
        [".nav", ".pilula-creme", ".dica"].forEach(function (sel) {
            anima(document.querySelector(sel), [{ opacity: 0 }, { opacity: 1 }], 700, 2450);
        });
        document.querySelectorAll(".hud").forEach(function (h) {
            anima(h, [{ opacity: 0 }, { opacity: 1 }], 600, 2200);
        });
        setTimeout(function () { contar(1900); }, 2200);

        // Ao terminar, o estado natural do CSS assume
        Promise.all(anims.map(function (a) { return a.finished; })).then(function () {
            anims.forEach(function (a) { a.cancel(); });
        }).catch(function () { });
    }

    // ---------- Cursor e saída no scroll ----------
    const camadas = Array.from(document.querySelectorAll(".camada")).map(function (el) {
        return {
            el,
            prof: Number(el.dataset.prof || 0),
            vel: Number(el.dataset.vel || 0),
            cresce: Number(el.dataset.cresce || 1),
            pilha: el.classList.contains("camada-pilha"),
            ultimo: ""
        };
    });
    const texto = document.querySelector(".hero-texto");
    const huds = document.querySelectorAll(".hud");
    const dica = document.querySelector(".dica");
    const veu = document.querySelector(".veu");

    let alvoX = 0, alvoY = 0, curX = 0, curY = 0, pSuave = 0;
    let ativo = true;

    if (mouse && !reduzido) {
        window.addEventListener("pointermove", function (e) {
            alvoX = (e.clientX / window.innerWidth) * 2 - 1;
            alvoY = (e.clientY / window.innerHeight) * 2 - 1;
        }, { passive: true });
    }

    function progresso() {
        const r = hero.getBoundingClientRect();
        const curso = hero.offsetHeight - window.innerHeight;
        if (curso <= 0) return 0;
        return Math.min(1, Math.max(0, -r.top / curso));
    }

    function faixa(p, a, b) { return Math.min(1, Math.max(0, (p - a) / (b - a))); }

    function quadro() {
        if (ativo) {
            curX += (alvoX - curX) * 0.05;
            curY += (alvoY - curY) * 0.05;
            pSuave += (progresso() - pSuave) * 0.18;
            desenhar(pSuave);
        }
        requestAnimationFrame(quadro);
    }

    // Desenha a cena para um progresso p (0 a 1) da saída
    function desenhar(p) {
        {
            const H = window.innerHeight;

            camadas.forEach(function (c) {
                const dx = -curX * 26 * c.prof;
                const dy = -curY * 14 * c.prof - p * c.vel * H;
                let escala = 1;
                if (c.pilha) escala = 1 - 0.14 * p;
                if (c.cresce > 1) escala = 1 + (c.cresce - 1) * p;
                const t = "translate3d(" + dx.toFixed(2) + "px," + dy.toFixed(2) + "px,0) scale(" + escala.toFixed(4) + ")";
                if (t !== c.ultimo) { c.el.style.transform = t; c.ultimo = t; }
                if (c.pilha) c.el.style.opacity = (1 - faixa(p, 0.28, 0.58)).toFixed(3);
            });

            const sumir = 1 - faixa(p, 0, 0.3);
            texto.style.transform = "translateY(" + (-p * H * 0.5).toFixed(1) + "px)";
            texto.style.opacity = sumir.toFixed(3);
            dica.style.opacity = sumir.toFixed(3);
            huds.forEach(function (h) { h.style.opacity = (1 - faixa(p, 0, 0.22)).toFixed(3); });
            veu.style.opacity = faixa(p, 0.5, 0.9).toFixed(3);
        }
    }
    // Para conferir a saída sem esperar a suavização
    window.liliDesenhar = function () { pSuave = progresso(); desenhar(pSuave); };

    // Pausa as animações CSS com o hero fora da tela
    new IntersectionObserver(function (entradas) {
        ativo = entradas[0].isIntersecting;
        hero.classList.toggle("pausado", !ativo);
    }).observe(hero);

    // ---------- Nav: some ao descer, volta ao subir ----------
    const nav = document.getElementById("nav");
    const fecho = document.getElementById("como");
    let ultimoY = window.scrollY;
    window.addEventListener("scroll", function () {
        const y = window.scrollY;
        if (y > ultimoY + 4 && y > 80) nav.classList.add("escondida");
        else if (y < ultimoY - 4 || y <= 80) nav.classList.remove("escondida");
        ultimoY = y;
        nav.classList.toggle("tinta", fecho.getBoundingClientRect().top < 60);
    }, { passive: true });

    // ---------- Lili comemora quando o mouse passa no botão ----------
    document.querySelectorAll('.pilula-creme').forEach(function (b) {
        ['pointerenter', 'focus'].forEach(function (ev) { b.addEventListener(ev, function () { hero.classList.add('lili-feliz'); }); });
        ['pointerleave', 'blur'].forEach(function (ev) { b.addEventListener(ev, function () { hero.classList.remove('lili-feliz'); }); });
    });

    // ---------- Início ----------
    montarFileiras();
    montarGrao();
    relogio();
    setInterval(relogio, 15000);

    let largura = window.innerWidth;
    let espera;
    window.addEventListener("resize", function () {
        clearTimeout(espera);
        espera = setTimeout(function () {
            if (window.innerWidth !== largura) { largura = window.innerWidth; montarFileiras(); }
        }, 200);
    });

    if (reduzido) {
        escreverContas(1);
        return;
    }

    const prontos = [
        document.fonts ? document.fonts.ready : Promise.resolve(),
        new Promise(function (r) { if (document.readyState === "complete") r(); else window.addEventListener("load", r); })
    ];
    Promise.race([
        Promise.all(prontos),
        new Promise(function (r) { setTimeout(r, 3000); })
    ]).then(function () {
        entrar();
        requestAnimationFrame(quadro);
    });
})();
