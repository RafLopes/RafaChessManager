document.addEventListener('DOMContentLoaded', async function() {
    const db = firebase.firestore();
    const tournamentSelect = document.getElementById('tournamentSelect');
    const loadTournamentButton = document.getElementById('loadTournamentButton');
    const tournamentInfo = document.getElementById('tournamentInfo');
    const playersList = document.getElementById('playersList');
    const finalResults = document.getElementById('finalResults');
    const e = UI.escapar;

    // Carregar a lista de torneios (mais recentes primeiro)
    try {
        const snapshot = await db.collection('torneio').get();
        snapshot.docs
            .filter(doc => doc.data().Resultado) // Verifica se a variável Resultado está preenchida
            .sort((a, b) => String(b.data().data).localeCompare(String(a.data().data)))
            .forEach(doc => {
                const torneioData = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = `${torneioData.nome} — ${UI.formatarData(torneioData.data)}`;
                tournamentSelect.appendChild(option);
            });
    } catch (error) {
        console.error('Error getting documents: ', error);
    }

    async function carregar() {
        const tournamentId = tournamentSelect.value;
        if (tournamentId === '') {
            alert('Por favor, selecione um torneio.');
            return;
        }

        try {
            const doc = await db.collection('torneio').doc(tournamentId).get();
            if (doc.exists) {
                const torneioData = doc.data();
                displayTournamentInfo(torneioData);
                displayPlayersList(torneioData.jogadores);
                displayHistoricoPartidas(torneioData.historicoPartidas);
                displayFinalResults(torneioData.Resultado, torneioData.jogadores);
                document.getElementById('botaoImprimir').classList.remove('d-none');
                history.replaceState(null, '', `?id=${encodeURIComponent(tournamentId)}`);
            } else {
                console.log('No such document!');
            }
        } catch (error) {
            console.error('Error getting document:', error);
        }
    }

    // Carregar os dados do torneio selecionado
    loadTournamentButton.addEventListener('click', carregar);
    tournamentSelect.addEventListener('change', () => { if (tournamentSelect.value) carregar(); });

    // Link direto: VisualizarTorneio.html?id=3
    const idUrl = new URLSearchParams(window.location.search).get('id');
    if (idUrl && [...tournamentSelect.options].some(o => o.value === idUrl)) {
        tournamentSelect.value = idUrl;
        carregar();
    }

    function displayTournamentInfo(torneioData) {
        document.getElementById('tituloTorneio').textContent = torneioData.nome;
        document.getElementById('subtituloTorneio').textContent = 'Classificação final e histórico de partidas';
        const formato = torneioData.Formato === 'schuring' ? 'Schuring' : 'Suíço';
        tournamentInfo.innerHTML = `
            <div class="d-flex flex-wrap gap-2">
                <span class="badge rounded-pill text-bg-light border fs-6 fw-normal"><i class="bi bi-calendar3 me-1"></i>${UI.formatarData(torneioData.data)}</span>
                <span class="badge rounded-pill text-bg-light border fs-6 fw-normal"><i class="bi bi-diagram-3 me-1"></i>${formato}</span>
                <span class="badge rounded-pill text-bg-light border fs-6 fw-normal"><i class="bi bi-arrow-repeat me-1"></i>${Object.keys(torneioData.historicoPartidas || {}).length || e(torneioData.etapas)} rodadas</span>
                <span class="badge rounded-pill text-bg-light border fs-6 fw-normal"><i class="bi bi-people me-1"></i>${(torneioData.jogadores || []).length} jogadores</span>
                ${torneioData.copa ? '<span class="badge rounded-pill text-bg-warning fs-6 fw-normal"><i class="bi bi-award me-1"></i>Copa</span>' : ''}
            </div>
        `;
    }

    function displayPlayersList(jogadores) {
        const ordenados = [...(jogadores || [])].sort((a, b) => Number(b.rating) - Number(a.rating));
        playersList.innerHTML = `
            <div class="card">
                <div class="card-header"><i class="bi bi-people"></i>Participantes</div>
                <div class="table-wrap">
                    <table class="table table-sm align-middle">
                        <thead><tr><th>Nome</th><th class="text-end">Rating inicial</th></tr></thead>
                        <tbody>
                            ${ordenados.map(jogador => `
                                <tr>
                                    <td><a href="HistoricoJogador.html?id=${encodeURIComponent(jogador.id)}" class="text-decoration-none">${e(jogador.nome)}</a></td>
                                    <td class="text-end num">${e(jogador.rating)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    function displayHistoricoPartidas(historicoPartidas) {
        const roundsContainer = document.getElementById('roundsContainer');
        roundsContainer.innerHTML = '';
        if (!historicoPartidas) {
            roundsContainer.innerHTML = '<div class="card"><div class="empty-state"><i class="bi bi-journal-x"></i>As partidas deste torneio não foram registradas no sistema (formato antigo).</div></div>';
            return;
        }

        // Ordenar as rodadas numericamente
        const rodadas = Object.keys(historicoPartidas).sort((a, b) => {
            const numA = parseInt(a.replace('rodada', ''));
            const numB = parseInt(b.replace('rodada', ''));
            return numA - numB;
        });

        const itens = rodadas.map((rodadaKey, i) => {
            const rodadaNum = rodadaKey.replace('rodada', '');
            const partidas = historicoPartidas[rodadaKey];
            return `
                <div class="accordion-item">
                    <h3 class="accordion-header">
                        <button class="accordion-button ${i === 0 ? '' : 'collapsed'}" type="button" data-bs-toggle="collapse" data-bs-target="#rodada-${rodadaNum}">
                            Rodada ${rodadaNum} <span class="badge text-bg-secondary ms-2">${partidas.length} mesas</span>
                        </button>
                    </h3>
                    <div id="rodada-${rodadaNum}" class="accordion-collapse collapse ${i === 0 ? 'show' : ''}">
                        <div class="table-wrap">
                            <table class="table table-sm align-middle mb-0">
                                <thead>
                                    <tr><th>Mesa</th><th>Brancas</th><th class="text-center">Resultado</th><th class="text-end">Pretas</th></tr>
                                </thead>
                                <tbody>
                                    ${partidas.map((partida, index) => `
                                        <tr>
                                            <td class="text-body-secondary">${index + 1}</td>
                                            <td class="${partida.resultado === '1-0' ? 'fw-semibold' : ''}">${e(partida.brancas.nome)} <span class="small text-body-secondary num">${partida.brancas.nome === 'BYE' ? '' : e(partida.brancas.rating)}</span></td>
                                            <td class="text-center"><span class="badge text-bg-light border num">${formatarResultado(partida.resultado)}</span></td>
                                            <td class="text-end ${partida.resultado === '0-1' ? 'fw-semibold' : ''}"><span class="small text-body-secondary num">${partida.pretas.nome === 'BYE' ? '' : e(partida.pretas.rating)}</span> ${e(partida.pretas.nome)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>`;
        }).join('');

        roundsContainer.innerHTML = `
            <h2 class="h5 mb-3"><i class="bi bi-grid-3x3-gap me-2" style="color:var(--xd-gold)"></i>Histórico de partidas</h2>
            <div class="accordion shadow-sm">${itens}</div>`;
    }

    function formatarResultado(resultado) {
        switch(resultado) {
            case '1-0': return '1 - 0';
            case '0-1': return '0 - 1';
            case '1/2-1/2': return '½ - ½';
            default: return e(resultado);
        }
    }

    function displayFinalResults(resultados, jogadores) {
        finalResults.innerHTML = '';
        if (!resultados) return;

        const resultadosSemBye = resultados.filter(resultado => {
            const nomeJogador = resultado.jogador?.nome || resultado.nome;
            return nomeJogador !== 'BYE';
        });

        const linhas = resultadosSemBye.map((resultado, index) => {
            const nomeJogador = resultado.jogador?.nome || resultado.nome;
            const jogador = jogadores.find(j => j.nome === nomeJogador);
            // Torneios antigos guardam o rating dentro de resultado.jogador
            const ratingJogador = Number(jogador ? jogador.rating : (resultado.jogador?.rating ?? resultado.rating));
            const variacaoRating = Number(resultado.variacaoRating || 0);
            const ratingAtualizado = ratingJogador + variacaoRating;
            const mostrarRating = valor => (Number.isFinite(valor) ? Math.round(valor) : '—');
            const classeDelta = variacaoRating > 0 ? 'delta-pos' : variacaoRating < 0 ? 'delta-neg' : '';

            return `
                <tr>
                    <td>${UI.badgePosicao(index + 1)}</td>
                    <td class="fw-semibold">${e(nomeJogador)}</td>
                    <td class="num fw-semibold">${e(resultado.pontos)}</td>
                    <td class="num">${e(resultado.vitorias)}</td>
                    <td class="num">${Number(resultado.sonnenbornBerger || 0).toFixed(2)}</td>
                    <td class="num ${classeDelta}">${variacaoRating > 0 ? '+' : ''}${Math.round(variacaoRating)}</td>
                    <td class="num text-body-secondary">${mostrarRating(ratingJogador)}</td>
                    <td class="num fw-semibold">${mostrarRating(ratingAtualizado)}</td>
                </tr>`;
        }).join('');

        const primeiros = resultadosSemBye.slice(0, 3).map(r => ({ nome: r.jogador?.nome || r.nome, detalhe: `${r.pontos} pts` }));

        finalResults.innerHTML = `
            <div class="card">
                <div class="card-header"><i class="bi bi-trophy"></i>Classificação final</div>
                <div class="card-body pb-0">${UI.podio(primeiros)}</div>
                <div class="table-wrap">
                    <table class="table table-hover align-middle">
                        <thead>
                            <tr>
                                <th>Pos.</th><th>Nome</th><th>Pontos</th><th>Vitórias</th>
                                <th title="Sonneborn-Berger">S-B</th><th>Variação</th><th>Rating inicial</th><th>Rating final</th>
                            </tr>
                        </thead>
                        <tbody>${linhas}</tbody>
                    </table>
                </div>
            </div>`;
    }
});
