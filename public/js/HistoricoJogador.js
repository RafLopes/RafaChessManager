// Elementos do DOM
const playerSelect = document.getElementById('playerSelect');
const playerInfo = document.getElementById('playerInfo');
const tournamentHistory = document.getElementById('tournamentHistory');
const playerName = document.getElementById('playerName');
const currentRatingSpan = document.getElementById('currentRating');
const maxRating = document.getElementById('maxRating');
const totalTournaments = document.getElementById('totalTournaments');
const tournamentTableBody = document.getElementById('tournamentTableBody');
const opponentSelect = document.getElementById('opponentSelect');
const statsInfo = document.getElementById('statsInfo');
const victories = document.getElementById('victories');
const draws = document.getElementById('draws');
const losses = document.getElementById('losses');
const copaJogador = document.getElementById('copaJogador');
const anoCopaJogador = document.getElementById('anoCopaJogador');
const resumoPartidas = document.getElementById('resumoPartidas');
const jogosConfronto = document.getElementById('jogosConfronto');

let ratingChart = null;

// Dados lidos uma vez e reaproveitados (lista de jogadores e partidas do jogador aberto)
let jogadores = [];
let partidasDoJogadorAtual = [];

// Referência ao Firestore
const db = firebase.firestore();

// Carregar lista de jogadores quando a página carregar
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const snapshot = await db.collection('players').get();

        // Limpar opções existentes
        playerSelect.innerHTML = '<option value="">Selecione um jogador</option>';

        // Coletar jogadores e ordenar alfabeticamente
        jogadores = snapshot.docs.map(doc => ({ id: doc.id, nome: doc.data().Nome }));
        jogadores.sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));

        // Adicionar jogadores ao select
        jogadores.forEach(player => {
            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = player.nome;
            playerSelect.appendChild(option);
        });

        // Carrega automaticamente ao escolher o jogador ou ao vir de um link (?id=)
        playerSelect.addEventListener('change', () => { if (playerSelect.value) loadPlayerHistory(); });
        const idUrl = new URLSearchParams(window.location.search).get('id');
        if (idUrl && jogadores.some(p => p.id === idUrl)) {
            playerSelect.value = idUrl;
            loadPlayerHistory();
        }
    } catch (error) {
        console.error('Erro ao carregar jogadores:', error);
        alert('Erro ao carregar lista de jogadores.');
    }
});

// Função para carregar o histórico do jogador
async function loadPlayerHistory() {
    const playerId = playerSelect.value;
    if (!playerId) {
        alert('Por favor, selecione um jogador.');
        return;
    }

    try {
        // Buscar informações do jogador
        const playerDoc = await db.collection('players').doc(playerId).get();
        const playerData = playerDoc.data();

        // Exibir informações básicas do jogador
        playerName.textContent = playerData.Nome;
        currentRatingSpan.textContent = playerData.Rating;
        maxRating.textContent = playerData.Rating;
        playerInfo.style.display = 'block';

        // Buscar todos os torneios uma única vez
        const tournamentsSnapshot = await db.collection('torneio').get();
        const todosTorneios = tournamentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Copa do ano e resumo das partidas
        const anoAtual = new Date().getFullYear();
        exibirCopa(EstatisticasJogador.copaDoJogador(Copa.calcular(todosTorneios, anoAtual), playerData.Nome), anoAtual);
        partidasDoJogadorAtual = EstatisticasJogador.partidasDoJogador(todosTorneios, playerId);
        exibirResumoPartidas(EstatisticasJogador.resumoPartidas(partidasDoJogadorAtual));

        const tournaments = [];

        // Processar cada torneio
        todosTorneios.forEach(torneioData => {
            // Verificar se o jogador está em qualquer uma das listas
            const jogadorNoTorneio = torneioData.jogadores?.some(j => j.id === playerId);
            const resultadoJogador = torneioData.Resultado?.find(r => r.id === playerId || r.jogador?.id === playerId);

            if (jogadorNoTorneio || resultadoJogador) {
                // Encontrar o rating inicial do jogador
                const jogadorInfo = torneioData.jogadores?.find(j => j.id === playerId);
                const ratingInicial = jogadorInfo ? jogadorInfo.rating : 0;

                // Encontrar a posição correta do jogador nos resultados
                let posicao = '-';
                if (torneioData.Resultado) {
                    const index = torneioData.Resultado.findIndex(r => r.id === playerId || r.jogador?.id === playerId);
                    if (index !== -1) {
                        posicao = index + 1;
                    }
                }

                tournaments.push({
                    id: torneioData.id,
                    nome: torneioData.nome,
                    data: torneioData.data,
                    posicao: posicao,
                    variacaoRating: resultadoJogador?.variacaoRating || 0,
                    ratingInicial: ratingInicial,
                    ratingFinal: resultadoJogador?.rating || ratingInicial  // rating final gravado no banco
                });
            }
        });

        // Atualizar total de torneios
        totalTournaments.textContent = tournaments.length;

        // Ordenar torneios por data (mais antigo primeiro para o gráfico)
        tournaments.sort((a, b) => new Date(a.data) - new Date(b.data));

        // Preparar dados para o gráfico (usa os ratings finais gravados, sem recalcular)
        const labels = tournaments.map(torneio => formatDate(torneio.data));
        const ratings = tournaments.map(torneio => Number(torneio.ratingFinal));

        // Atualizar ou criar o gráfico
        updateRatingChart(labels, ratings);

        // Reordenar torneios por data (mais recente primeiro para a tabela)
        tournaments.sort((a, b) => new Date(b.data) - new Date(a.data));

        // Limpar e preencher a tabela
        tournamentTableBody.innerHTML = '';
        let maxRatingFound = playerData.Rating;

        tournaments.forEach(torneio => {
            const ratingFinal = Number(torneio.ratingInicial) + Number(torneio.variacaoRating);
            maxRatingFound = Math.max(maxRatingFound, ratingFinal);

            const tr = document.createElement('tr');
            const temPosicao = typeof torneio.posicao === 'number';
            const classePos = temPosicao && torneio.posicao <= 3 ? `pos-${torneio.posicao}` : '';
            const classeDelta = torneio.variacaoRating > 0 ? 'delta-pos' : torneio.variacaoRating < 0 ? 'delta-neg' : '';
            tr.innerHTML = `
                <td class="fw-semibold" style="min-width: 12rem;"><a href="VisualizarTorneio.html?id=${encodeURIComponent(torneio.id)}" class="text-decoration-none">${UI.escapar(torneio.nome)}</a></td>
                <td class="text-nowrap">${formatDate(torneio.data)}</td>
                <td>${temPosicao ? `<span class="pos-badge ${classePos}">${torneio.posicao}º</span>` : '<span class="text-body-secondary" title="Torneio em andamento">—</span>'}</td>
                <td class="num">${torneio.ratingInicial}</td>
                <td class="num ${classeDelta}">${torneio.variacaoRating > 0 ? '+' : ''}${torneio.variacaoRating}</td>
                <td class="num fw-semibold">${ratingFinal}</td>
            `;
            tournamentTableBody.appendChild(tr);
        });

        // Atualizar maior rating encontrado
        maxRating.textContent = maxRatingFound;
        tournamentHistory.style.display = 'block';

        // Após carregar as informações do jogador
        loadOpponents(playerId);

    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        alert('Erro ao carregar histórico do jogador.');
    }
}

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// Bloco "Copa do ano": mesmos números da página da Copa
function exibirCopa(copa, ano) {
    anoCopaJogador.textContent = ano;
    if (!copa) {
        copaJogador.innerHTML = `<div class="text-body-secondary">Ainda não jogou etapas da Copa ${ano}.</div>`;
        return;
    }
    copaJogador.innerHTML = `
        <div class="d-flex align-items-center gap-3">
            ${UI.badgePosicao(copa.posicao)}
            <div>
                <div class="stat-valor num">${UI.escapar(copa.pontos)} <span class="fs-6 fw-normal text-body-secondary">pts</span></div>
                <div class="small text-body-secondary">${copa.posicao}º lugar · ${plural(copa.etapas, 'etapa', 'etapas')} · ${plural(copa.vitorias, 'etapa vencida', 'etapas vencidas')} · ${plural(copa.podios, 'pódio', 'pódios')}</div>
            </div>
        </div>
        <a href="ResultadoCopa.html" class="small d-inline-block mt-2 text-decoration-none">Ver a Copa <i class="bi bi-arrow-right"></i></a>
    `;
}

const linhaVED = c => `${c.v}V ${c.e}E ${c.d}D`;

// Bloco "Partidas": todas as partidas presenciais do jogador
function exibirResumoPartidas(r) {
    if (!r.partidas) {
        resumoPartidas.innerHTML = '<div class="text-body-secondary">Nenhuma partida registrada.</div>';
        return;
    }
    resumoPartidas.innerHTML = `
        <div class="row g-2 text-center">
            <div class="col-4"><div class="border rounded-3 stat-card stat-win p-2"><div class="stat-valor num">${r.vitorias}</div><div class="stat-rotulo">Vitórias</div></div></div>
            <div class="col-4"><div class="border rounded-3 stat-card stat-draw p-2"><div class="stat-valor num">${r.empates}</div><div class="stat-rotulo">Empates</div></div></div>
            <div class="col-4"><div class="border rounded-3 stat-card stat-loss p-2"><div class="stat-valor num">${r.derrotas}</div><div class="stat-rotulo">Derrotas</div></div></div>
        </div>
        <div class="small mt-2">
            <span class="fw-semibold">${r.aproveitamento}% de aproveitamento</span> em ${plural(r.partidas, 'partida', 'partidas')}
        </div>
        <div class="small text-body-secondary"><i class="bi bi-square"></i> Brancas: ${linhaVED(r.brancas)} · <i class="bi bi-square-fill"></i> Pretas: ${linhaVED(r.pretas)}</div>
    `;
}

function updateRatingChart(labels, ratings) {
    // Destruir gráfico existente se houver
    if (ratingChart) {
        ratingChart.destroy();
    }

    // Criar novo gráfico (cores seguem o tema claro/escuro)
    const estilo = getComputedStyle(document.documentElement);
    const corLinha = estilo.getPropertyValue('--xd-gold').trim() || '#c49a2c';
    const corTexto = estilo.getPropertyValue('--xd-muted').trim() || '#6b7280';
    const corGrade = estilo.getPropertyValue('--xd-border').trim() || '#e6e1d6';
    const ctx = document.getElementById('ratingChart').getContext('2d');
    ratingChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Rating',
                data: ratings,
                borderColor: corLinha,
                backgroundColor: corLinha + '22',
                pointBackgroundColor: corLinha,
                pointRadius: 4,
                pointHoverRadius: 6,
                borderWidth: 2.5,
                tension: 0.25,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: { color: corTexto },
                    grid: { color: corGrade }
                },
                x: {
                    ticks: { color: corTexto },
                    grid: { display: false }
                }
            }
        }
    });
    ratingChart.$dados = { labels, ratings };
}

// Redesenha o gráfico quando o tema muda
document.addEventListener('tema-alterado', () => {
    if (ratingChart && ratingChart.$dados) updateRatingChart(ratingChart.$dados.labels, ratingChart.$dados.ratings);
});

// Função auxiliar para formatar data
function formatDate(dateString) {
    // "aaaa-mm-dd" → "dd/mm/aaaa" sem passar por Date (que converte de UTC e mostrava o dia anterior)
    return UI.formatarData(dateString);
}

// Preenche o select de adversários com a lista já carregada
function loadOpponents(currentPlayerId) {
    opponentSelect.innerHTML = '<option value="">Selecione um jogador</option>';
    statsInfo.style.display = 'none';
    jogadores
        .filter(j => j.id !== currentPlayerId)
        .forEach(j => {
            const option = document.createElement('option');
            option.value = j.id;
            option.textContent = j.nome;
            opponentSelect.appendChild(option);
        });
}

const ROTULO_RESULTADO = {
    V: '<span class="badge text-bg-success">Vitória</span>',
    E: '<span class="badge text-bg-secondary">Empate</span>',
    D: '<span class="badge text-bg-danger">Derrota</span>'
};

// Lista dos jogos do confronto direto, do mais recente para o mais antigo
function exibirJogosConfronto(jogos) {
    if (!jogos.length) {
        jogosConfronto.innerHTML = '<div class="small text-body-secondary">Nunca se enfrentaram em torneios registrados.</div>';
        return;
    }
    jogosConfronto.innerHTML = `
        <div class="small fw-semibold mb-1">${plural(jogos.length, 'jogo', 'jogos')}</div>
        <ul class="list-group list-group-flush small" style="max-height: 22rem; overflow-y: auto;">
            ${jogos.map(j => `
                <li class="list-group-item px-0 d-flex justify-content-between align-items-start gap-2">
                    <div>
                        <a href="VisualizarTorneio.html?id=${encodeURIComponent(j.torneioId)}" class="text-decoration-none">${UI.escapar(j.torneioNome)}</a>
                        <div class="text-body-secondary">${formatDate(j.data)}${j.rodada ? ` · rodada ${j.rodada}` : ''} · ${j.cor === 'brancas' ? '<i class="bi bi-square"></i> brancas' : '<i class="bi bi-square-fill"></i> pretas'}</div>
                    </div>
                    ${ROTULO_RESULTADO[j.resultado]}
                </li>`).join('')}
        </ul>
    `;
}

// Confronto direto: usa as partidas já carregadas do jogador
opponentSelect.addEventListener('change', () => {
    const opponentId = opponentSelect.value;
    if (!playerSelect.value || !opponentId) {
        statsInfo.style.display = 'none';
        return;
    }
    const c = EstatisticasJogador.confronto(partidasDoJogadorAtual, opponentId);
    victories.textContent = c.vitorias;
    draws.textContent = c.empates;
    losses.textContent = c.derrotas;
    exibirJogosConfronto(c.jogos);
    statsInfo.style.display = 'block';
});
