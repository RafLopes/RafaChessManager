// Componentes visuais compartilhados por todas as páginas:
// navbar, rodapé, tema claro/escuro, toasts (no lugar de alert), modal de confirmação,
// controle de acesso de páginas de admin e botões de resultado das partidas.
// Este arquivo só LÊ do banco (verificação de torneio em aberto); nunca grava.

(function () {
    const base = document.body.dataset.base || '';

    const MENU = [
        { chave: 'inicio', titulo: 'Início', icone: 'house', href: 'index.html' },
        {
            chave: 'jogadores', titulo: 'Jogadores', icone: 'people', itens: [
                { titulo: 'Lista de jogadores', icone: 'list-ol', href: 'ListaPlayers.html' },
                { titulo: 'Histórico do jogador', icone: 'graph-up', href: 'HistoricoJogador.html' },
                { admin: true, titulo: 'Cadastrar jogador', icone: 'person-plus', href: 'CadastroPlayers.html' },
                { admin: true, titulo: 'Remover jogador', icone: 'person-x', href: 'RemoverPlayers.html' }
            ]
        },
        {
            chave: 'torneios', titulo: 'Torneio Presencial', icone: 'trophy', itens: [
                { titulo: 'Visualizar torneio', icone: 'eye', href: 'VisualizarTorneio.html' },
                { titulo: 'Resultado da Copa', icone: 'award', href: 'ResultadoCopa.html' },
                { admin: true, titulo: 'Cadastrar torneio', icone: 'plus-circle', href: 'CadastroTorneio.html', requer: 'sem-aberto' },
                { admin: true, titulo: 'Editar torneio', icone: 'pencil-square', href: 'EditarTorneio.html', requer: 'aberto' },
                { admin: true, titulo: 'Jogar torneio', icone: 'play-circle', href: 'JogarTorneio.html', requer: 'aberto' },
                { admin: true, titulo: 'Torneio manual', icone: 'journal-text', href: 'TorneioManual.html' },
                { admin: true, titulo: 'Somador de torneios', icone: 'calculator', href: 'temp/SomadorTorneios.html' }
            ]
        },
        {
            chave: 'online', titulo: 'Torneio Online', icone: 'globe2', itens: [
                { titulo: 'Classificação online', icone: 'bar-chart', href: 'ClassificacaoOnline.html' },
                { titulo: 'Etapas do torneio', icone: 'link-45deg', href: 'LinksEtapas.html' },
                { admin: true, titulo: 'Gerenciar etapas', icone: 'sliders', href: 'GerenciarEtapasOnline.html' }
            ]
        }
    ];

    function ehAdminProvavel() {
        try { return localStorage.getItem('userRole') === 'admin'; } catch (e) { return false; }
    }

    function linkItem(item) {
        const requer = item.requer ? ` data-requer="${item.requer}"` : '';
        return `<li class="${item.admin ? 'so-admin' : ''}"><a class="dropdown-item" href="${base}${item.href}"${requer}><i class="bi bi-${item.icone}"></i>${item.titulo}</a></li>`;
    }

    function renderNavbar() {
        const pagina = document.body.dataset.pagina || '';
        const itens = MENU.map(m => {
            if (!m.itens) {
                return `<li class="nav-item"><a class="nav-link ${pagina === m.chave ? 'active' : ''}" href="${base}${m.href}"><i class="bi bi-${m.icone} me-1"></i>${m.titulo}</a></li>`;
            }
            const publicos = m.itens.filter(i => !i.admin).map(linkItem).join('');
            const admins = m.itens.filter(i => i.admin).map(linkItem).join('');
            return `
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle ${pagina === m.chave ? 'active' : ''}" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="bi bi-${m.icone} me-1"></i>${m.titulo}
                    </a>
                    <ul class="dropdown-menu">
                        ${publicos}
                        ${admins ? `<li class="so-admin"><hr class="dropdown-divider"></li><li class="so-admin"><h6 class="dropdown-header admin-header">Administração</h6></li>${admins}` : ''}
                    </ul>
                </li>`;
        }).join('');

        const faixaTeste = window.AMBIENTE_TESTE
            ? '<div class="ambiente-teste"><i class="bi bi-cone-striped me-1"></i>AMBIENTE DE TESTE — emulador local (o banco real não é acessado)</div>'
            : '';

        const nav = document.createElement('div');
        nav.innerHTML = `
            ${faixaTeste}
            <nav class="navbar navbar-expand-lg app-navbar" data-bs-theme="dark">
                <div class="container">
                    <a class="navbar-brand" href="${base}index.html">
                        <img class="brand-mark" src="${base}img/logo.svg" alt="" width="34" height="34">
                        <span>Xadrez Erbo Stenzel</span>
                    </a>
                    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#menuPrincipal" aria-controls="menuPrincipal" aria-expanded="false" aria-label="Abrir menu">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    <div class="collapse navbar-collapse" id="menuPrincipal">
                        <ul class="navbar-nav me-auto mb-2 mb-lg-0">${itens}</ul>
                        <div class="d-flex align-items-center gap-2">
                            <button class="btn btn-sm btn-outline-light" id="botaoTema" type="button" title="Alternar tema claro/escuro" aria-label="Alternar tema claro/escuro">
                                <i class="bi bi-moon-stars"></i>
                            </button>
                            <a class="btn btn-sm btn-gold" id="botaoLogin" href="${base}login.html"><i class="bi bi-box-arrow-in-right me-1"></i>Entrar</a>
                            <div class="dropdown d-none" id="menuUsuario">
                                <button class="btn btn-sm btn-outline-light dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
                                    <i class="bi bi-person-circle me-1"></i><span id="emailUsuario">Admin</span>
                                </button>
                                <ul class="dropdown-menu dropdown-menu-end">
                                    <li><button class="dropdown-item" id="botaoSair"><i class="bi bi-box-arrow-right me-2"></i>Sair</button></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>`;
        document.body.prepend(...nav.children);

        aplicarVisibilidadeAdmin(ehAdminProvavel());
        atualizarIconeTema();
        document.getElementById('botaoTema').addEventListener('click', alternarTema);
        document.getElementById('botaoSair').addEventListener('click', sair);
    }

    function renderRodape() {
        const footer = document.createElement('footer');
        footer.className = 'app-footer';
        footer.innerHTML = `
            <div class="container d-flex flex-wrap justify-content-between gap-2">
                <span><i class="bi bi-trophy me-1"></i>Clube de Xadrez Erbo Stenzel</span>
                <span>Desenvolvido por Rafael Lopes · <a href="${base}About.html">Sobre o sistema</a></span>
            </div>`;
        document.body.appendChild(footer);
    }

    function aplicarVisibilidadeAdmin(admin) {
        document.querySelectorAll('.so-admin').forEach(el => el.classList.toggle('d-none', !admin));
    }

    // ---------- tema ----------
    function alternarTema() {
        const atual = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-bs-theme', atual);
        try { localStorage.setItem('tema', atual); } catch (e) {}
        atualizarIconeTema();
        document.dispatchEvent(new CustomEvent('tema-alterado', { detail: atual }));
    }

    function atualizarIconeTema() {
        const botao = document.getElementById('botaoTema');
        if (!botao) return;
        const escuro = document.documentElement.getAttribute('data-bs-theme') === 'dark';
        botao.innerHTML = `<i class="bi bi-${escuro ? 'sun' : 'moon-stars'}"></i>`;
    }

    // ---------- autenticação ----------
    function sair() {
        firebase.auth().signOut().then(() => {
            try { localStorage.setItem('userRole', 'guest'); } catch (e) {}
            window.location.href = base + 'index.html';
        });
    }

    function prepararPaginaAdmin() {
        if (!('admin' in document.body.dataset)) return;
        const main = document.querySelector('.app-main');
        if (!main) return;
        main.classList.add('d-none');
        const aviso = document.createElement('div');
        aviso.className = 'app-main container';
        aviso.id = 'avisoAcesso';
        aviso.innerHTML = `<div class="card restrito-card"><div class="card-body text-center p-4">
            <div class="spinner-border text-secondary" role="status"></div>
            <p class="mt-3 mb-0 text-body-secondary">Verificando acesso...</p></div></div>`;
        main.after(aviso);
    }

    function atualizarPaginaAdmin(usuario) {
        if (!('admin' in document.body.dataset)) return;
        const main = document.querySelector('.app-main');
        const aviso = document.getElementById('avisoAcesso');
        if (usuario) {
            main.classList.remove('d-none');
            if (aviso) aviso.remove();
        } else if (aviso) {
            aviso.innerHTML = `<div class="card restrito-card"><div class="card-body text-center p-4">
                <i class="bi bi-shield-lock" style="font-size:2.5rem;color:var(--xd-gold)"></i>
                <h2 class="h4 mt-2">Acesso restrito</h2>
                <p class="text-body-secondary">Esta área é exclusiva para administradores do clube.</p>
                <a href="${base}login.html" class="btn btn-primary"><i class="bi bi-box-arrow-in-right me-1"></i>Fazer login</a>
                <a href="${base}index.html" class="btn btn-link">Voltar ao início</a></div></div>`;
        }
    }

    function observarAutenticacao() {
        if (!window.firebase || !firebase.auth) {
            atualizarPaginaAdmin(null);
            return;
        }
        firebase.auth().onAuthStateChanged(usuario => {
            try { localStorage.setItem('userRole', usuario ? 'admin' : 'guest'); } catch (e) {}
            aplicarVisibilidadeAdmin(!!usuario);
            document.getElementById('botaoLogin').classList.toggle('d-none', !!usuario);
            document.getElementById('menuUsuario').classList.toggle('d-none', !usuario);
            if (usuario) document.getElementById('emailUsuario').textContent = usuario.email || 'Admin';
            atualizarPaginaAdmin(usuario);
            document.dispatchEvent(new CustomEvent('auth-pronto', { detail: usuario }));
        });
    }

    // ---------- toasts (substituem alert) ----------
    function tipoDaMensagem(msg) {
        const m = String(msg).toLowerCase();
        if (m.includes('erro') || m.includes('não é possível') || m.includes('não encontrado')) return 'danger';
        if (m.includes('sucesso')) return 'success';
        if (m.includes('por favor') || m.includes('selecione') || m.includes('existe') || m.includes('não existem')) return 'warning';
        return 'info';
    }

    const ICONES_TOAST = { success: 'check-circle-fill', danger: 'x-octagon-fill', warning: 'exclamation-triangle-fill', info: 'info-circle-fill' };

    function mostrarToast(mensagem, tipo) {
        tipo = tipo || tipoDaMensagem(mensagem);
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(container);
        }
        const el = document.createElement('div');
        el.className = `toast align-items-center text-bg-${tipo} border-0`;
        el.setAttribute('role', tipo === 'danger' ? 'alert' : 'status');
        el.setAttribute('aria-live', 'polite');
        el.innerHTML = `<div class="d-flex"><div class="toast-body" style="white-space:pre-line"><i class="bi bi-${ICONES_TOAST[tipo]} me-2"></i></div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Fechar"></button></div>`;
        el.querySelector('.toast-body').append(String(mensagem));
        container.appendChild(el);
        const toast = new bootstrap.Toast(el, { delay: tipo === 'danger' ? 8000 : 4500 });
        el.addEventListener('hidden.bs.toast', () => el.remove());
        toast.show();
    }

    // Mensagens exibidas logo antes de um reload/redirect sobrevivem para a próxima página
    function toastPersistente(mensagem) {
        let fila = [];
        try { fila = JSON.parse(sessionStorage.getItem('toastsPendentes') || '[]'); } catch (e) {}
        fila.push(String(mensagem));
        try { sessionStorage.setItem('toastsPendentes', JSON.stringify(fila)); } catch (e) {}
        mostrarToast(mensagem);
        setTimeout(() => {
            try {
                const restante = JSON.parse(sessionStorage.getItem('toastsPendentes') || '[]');
                restante.splice(restante.indexOf(String(mensagem)), 1);
                sessionStorage.setItem('toastsPendentes', JSON.stringify(restante));
            } catch (e) {}
        }, 1500);
    }

    function mostrarToastsPendentes() {
        try {
            const fila = JSON.parse(sessionStorage.getItem('toastsPendentes') || '[]');
            sessionStorage.removeItem('toastsPendentes');
            fila.forEach(m => mostrarToast(m));
        } catch (e) {}
    }

    // ---------- modal de confirmação ----------
    function confirmar(mensagem, opcoes) {
        opcoes = opcoes || {};
        return new Promise(resolve => {
            const el = document.createElement('div');
            el.className = 'modal fade';
            el.tabIndex = -1;
            el.innerHTML = `<div class="modal-dialog modal-dialog-centered"><div class="modal-content">
                <div class="modal-header"><h2 class="modal-title h5"><i class="bi bi-${opcoes.perigo ? 'exclamation-triangle text-danger' : 'question-circle'} me-2"></i></h2>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button></div>
                <div class="modal-body" style="white-space:pre-line"></div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal" data-cancelar></button>
                    <button type="button" class="btn ${opcoes.perigo ? 'btn-danger' : 'btn-primary'}" data-confirmar></button>
                </div></div></div>`;
            el.querySelector('.modal-title').append(opcoes.titulo || 'Confirmar');
            el.querySelector('.modal-body').append(mensagem);
            el.querySelector('[data-confirmar]').textContent = opcoes.botao || 'Confirmar';
            el.querySelector('[data-cancelar]').textContent = opcoes.cancelar || 'Cancelar';
            document.body.appendChild(el);
            const modal = new bootstrap.Modal(el);
            let confirmado = false;
            el.querySelector('[data-confirmar]').addEventListener('click', () => { confirmado = true; modal.hide(); });
            el.addEventListener('hidden.bs.modal', () => { el.remove(); resolve(confirmado); });
            modal.show();
        });
    }

    // ---------- links que dependem de existir torneio em aberto ----------
    async function verificarTorneiosAbertos() {
        const snapshot = await firebase.firestore().collection('torneio').get();
        const aberto = snapshot.docs.find(doc => !doc.data().Resultado);
        return aberto
            ? { existeTorneioAberto: true, nomeTorneio: aberto.data().nome }
            : { existeTorneioAberto: false };
    }

    function protegerLinksDeTorneio() {
        document.addEventListener('click', async event => {
            const link = event.target.closest('a[data-requer]');
            if (!link) return;
            event.preventDefault();
            try {
                const { existeTorneioAberto, nomeTorneio } = await verificarTorneiosAbertos();
                if (link.dataset.requer === 'sem-aberto' && existeTorneioAberto) {
                    mostrarToast(`Existe um torneio em aberto: ${nomeTorneio}.\nFinalize este torneio antes de cadastrar um novo.`, 'warning');
                } else if (link.dataset.requer === 'aberto' && !existeTorneioAberto) {
                    mostrarToast('Não existem torneios em aberto no momento.', 'warning');
                } else {
                    window.location.href = link.href;
                }
            } catch (error) {
                console.error('Erro ao verificar torneios:', error);
                mostrarToast('Erro ao verificar torneios. Por favor, tente novamente.', 'danger');
            }
        });
    }

    // ---------- botões de resultado (1-0 / ½ / 0-1) ----------
    // O <select class="resultado-select"> original continua no DOM (escondido) e é ele que
    // a lógica do torneio lê; os botões apenas preenchem o select.
    const OPCOES_RESULTADO = [
        { valor: '1-0', rotulo: '1-0', titulo: 'Vitória das brancas' },
        { valor: '1/2-1/2', rotulo: '½-½', titulo: 'Empate' },
        { valor: '0-1', rotulo: '0-1', titulo: 'Vitória das pretas' }
    ];

    function aprimorarResultados(raiz) {
        (raiz || document).querySelectorAll('select.resultado-select:not([data-aprimorado])').forEach(select => {
            select.dataset.aprimorado = '1';
            select.classList.add('d-none');
            if (select.disabled) {
                const badge = document.createElement('span');
                badge.className = 'bye-badge';
                badge.innerHTML = '<i class="bi bi-cup-hot"></i>BYE · 1 ponto';
                select.after(badge);
                return;
            }
            const grupo = document.createElement('div');
            grupo.className = 'btn-group btn-group-sm resultado-toggle';
            grupo.setAttribute('role', 'group');
            grupo.setAttribute('aria-label', 'Resultado da partida');
            OPCOES_RESULTADO.forEach(op => {
                const botao = document.createElement('button');
                botao.type = 'button';
                botao.className = 'btn btn-outline-secondary';
                botao.dataset.valor = op.valor;
                botao.title = op.titulo;
                botao.textContent = op.rotulo;
                botao.addEventListener('click', () => {
                    select.value = op.valor;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                });
                grupo.appendChild(botao);
            });
            const sincronizar = () => {
                grupo.querySelectorAll('.btn').forEach(b => {
                    const ativo = b.dataset.valor === select.value;
                    b.classList.toggle('active', ativo);
                    b.setAttribute('aria-pressed', ativo);
                });
            };
            select.addEventListener('change', sincronizar);
            sincronizar();
            select.after(grupo);
        });
    }

    function travarRodada(rodada) {
        if (rodada.classList.contains('rodada-travada')) return;
        rodada.classList.add('rodada-travada');
        rodada.querySelectorAll('.resultado-toggle .btn').forEach(b => { b.disabled = true; });
        rodada.querySelectorAll('select.resultado-select').forEach(s => { s.disabled = true; });
        rodada.querySelectorAll('.botao-torneio').forEach(b => b.remove());
    }

    function escapar(texto) {
        return String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function formatarData(iso) {
        if (!iso) return '—';
        const [a, m, d] = String(iso).split('-');
        return d && m && a ? `${d}/${m}/${a}` : iso;
    }

    // Pódio dos 3 primeiros: recebe [{ nome, detalhe }] já na ordem de classificação
    function podio(primeiros) {
        const medalhas = ['🥇', '🥈', '🥉'];
        const ordemVisual = [1, 0, 2].filter(i => primeiros[i]);
        return `<div class="podio my-3">${ordemVisual.map(i => `
            <div class="podio-lugar podio-${i + 1}">
                <div class="podio-medalha">${medalhas[i]}</div>
                <div class="podio-nome">${escapar(primeiros[i].nome)}</div>
                <div class="podio-pontos">${escapar(primeiros[i].detalhe)}</div>
                <div class="podio-bloco">${i + 1}º</div>
            </div>`).join('')}</div>`;
    }

    function badgePosicao(pos) {
        return `<span class="pos-badge ${pos <= 3 ? 'pos-' + pos : ''}">${pos}</span>`;
    }

    window.UI = {
        toast: mostrarToast, confirmar, aprimorarResultados, travarRodada,
        verificarTorneiosAbertos, escapar, formatarData, podio, badgePosicao
    };

    // Todos os alert() do sistema viram toasts
    window.alert = toastPersistente;

    document.addEventListener('DOMContentLoaded', () => {
        renderNavbar();
        renderRodape();
        prepararPaginaAdmin();
        observarAutenticacao();
        protegerLinksDeTorneio();
        mostrarToastsPendentes();
    });
})();
