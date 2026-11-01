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

let ratingChart = null;

// Referência ao Firestore
const db = firebase.firestore();

// Carregar lista de jogadores quando a página carregar
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('players').get();
        
        // Limpar opções existentes
        playerSelect.innerHTML = '<option value="">Selecione um jogador</option>';
        
        // Coletar jogadores e ordenar alfabeticamente
        const players = [];
        snapshot.forEach(doc => {
            players.push({
                id: doc.id,
                nome: doc.data().Nome
            });
        });
        
        // Ordenar alfabeticamente por nome
        players.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        
        // Adicionar jogadores ao select
        players.forEach(player => {
            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = player.nome;
            playerSelect.appendChild(option);
        });

        // Carrega automaticamente ao escolher o jogador ou ao vir de um link (?id=)
        playerSelect.addEventListener('change', () => { if (playerSelect.value) loadPlayerHistory(); });
        const idUrl = new URLSearchParams(window.location.search).get('id');
        if (idUrl && players.some(p => p.id === idUrl)) {
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
        const db = firebase.firestore();
        
        // Buscar informações do jogador
        const playerDoc = await db.collection('players').doc(playerId).get();
        const playerData = playerDoc.data();

        // Exibir informações básicas do jogador
        playerName.textContent = playerData.Nome;
        currentRatingSpan.textContent = playerData.Rating;
        maxRating.textContent = playerData.Rating;
        playerInfo.style.display = 'block';

        // Buscar todos os torneios
        const tournamentsSnapshot = await db.collection('torneio').get();
        const tournaments = [];

        // Processar cada torneio
        tournamentsSnapshot.forEach(doc => {
            const torneioData = doc.data();
            
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
                    id: doc.id,
                    nome: torneioData.nome,
                    data: torneioData.data,
                    posicao: posicao,
                    variacaoRating: resultadoJogador?.variacaoRating || 0,
                    ratingInicial: ratingInicial,
                    ratingFinal: resultadoJogador?.rating || ratingInicial  // NOVO: adicionar rating final do banco
                });
            }
        });

        // Atualizar total de torneios
        totalTournaments.textContent = tournaments.length;

        // Ordenar torneios por data (mais antigo primeiro para o gráfico)
        tournaments.sort((a, b) => new Date(a.data) - new Date(b.data));

        // Preparar dados para o gráfico
        const labels = [];
        const ratings = [];

        if (tournaments.length > 0) {
            // Usar os rating finais reais do banco (não recalcular!)
            tournaments.forEach(torneio => {
                labels.push(formatDate(torneio.data));
                ratings.push(Number(torneio.ratingFinal));
            });
        }

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
            const classePos = typeof torneio.posicao === 'number' && torneio.posicao <= 3 ? `pos-${torneio.posicao}` : '';
            const classeDelta = torneio.variacaoRating > 0 ? 'delta-pos' : torneio.variacaoRating < 0 ? 'delta-neg' : '';
            tr.innerHTML = `
                <td class="fw-semibold" style="min-width: 12rem;"><a href="VisualizarTorneio.html?id=${encodeURIComponent(torneio.id)}" class="text-decoration-none">${UI.escapar(torneio.nome)}</a></td>
                <td class="text-nowrap">${formatDate(torneio.data)}</td>
                <td><span class="pos-badge ${classePos}">${torneio.posicao}º</span></td>
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

// Função para carregar adversários no select
function loadOpponents(currentPlayerId) {
    opponentSelect.innerHTML = '<option value="">Selecione um jogador</option>';
    
    db.collection('players').get().then(snapshot => {
        snapshot.docs
            .filter(doc => doc.id !== currentPlayerId)
            .sort((a, b) => String(a.data().Nome).localeCompare(String(b.data().Nome), 'pt-BR'))
            .forEach(doc => {
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = doc.data().Nome;
                opponentSelect.appendChild(option);
            });
    });
}

// Função para calcular estatísticas contra um adversário específico
async function calculateHeadToHead(playerId, opponentId) {
    console.log(`Calculando estatísticas: Jogador ${playerId} vs Oponente ${opponentId}`);
    
    const stats = {
        victories: 0,
        draws: 0,
        losses: 0
    };

    try {
        const tournamentsSnapshot = await db.collection('torneio').get();
        
        // Para debug
        console.log(`Total de torneios encontrados: ${tournamentsSnapshot.size}`);
        
        tournamentsSnapshot.forEach(doc => {
            const torneioData = doc.data();
            console.log(`Analisando torneio: ${torneioData.nome || 'Sem nome'}`);
            
            // Verificar nas partidas antigas (formato antigo)
            if (torneioData.Partidas && Array.isArray(torneioData.Partidas)) {
                console.log(`Torneio tem ${torneioData.Partidas.length} partidas no formato antigo`);
                
                torneioData.Partidas.forEach(partida => {
                    // Extrair IDs dos jogadores com segurança
                    let brancasId = null;
                    let pretasId = null;
                    
                    // Verificar diferentes formatos possíveis
                    if (typeof partida.brancas === 'object' && partida.brancas !== null) {
                        brancasId = partida.brancas.id;
                    } else if (typeof partida.brancas === 'string') {
                        brancasId = partida.brancas;
                    }
                    
                    if (typeof partida.pretas === 'object' && partida.pretas !== null) {
                        pretasId = partida.pretas.id;
                    } else if (typeof partida.pretas === 'string') {
                        pretasId = partida.pretas;
                    }
                    
                    // Verificar se a partida é entre os jogadores em questão
                    if ((brancasId === playerId && pretasId === opponentId) || 
                        (brancasId === opponentId && pretasId === playerId)) {
                        
                        console.log(`Encontrada partida entre os jogadores: ${brancasId} vs ${pretasId}, resultado: ${partida.resultado}`);
                        
                        const isPlayerWhite = brancasId === playerId;
                        
                        if (partida.resultado === '1-0') {
                            isPlayerWhite ? stats.victories++ : stats.losses++;
                        } else if (partida.resultado === '0-1') {
                            isPlayerWhite ? stats.losses++ : stats.victories++;
                        } else if (partida.resultado === '½-½' || partida.resultado === '1/2-1/2') {
                            stats.draws++;
                        }
                    }
                });
            }
            
            // Verificar no novo formato historicoPartidas
            if (torneioData.historicoPartidas && typeof torneioData.historicoPartidas === 'object') {
                console.log(`Torneio tem histórico de partidas no novo formato`);
                
                // Percorrer todas as rodadas
                Object.keys(torneioData.historicoPartidas).forEach(rodadaKey => {
                    const partidas = torneioData.historicoPartidas[rodadaKey];
                    
                    if (Array.isArray(partidas)) {
                        console.log(`Rodada ${rodadaKey} tem ${partidas.length} partidas`);
                        
                        partidas.forEach(partida => {
                            // Extrair IDs dos jogadores com segurança
                            let brancasId = null;
                            let pretasId = null;
                            
                            // Verificar diferentes formatos possíveis
                            if (typeof partida.brancas === 'object' && partida.brancas !== null) {
                                brancasId = partida.brancas.id;
                            } else if (typeof partida.brancas === 'string') {
                                brancasId = partida.brancas;
                            }
                            
                            if (typeof partida.pretas === 'object' && partida.pretas !== null) {
                                pretasId = partida.pretas.id;
                            } else if (typeof partida.pretas === 'string') {
                                pretasId = partida.pretas;
                            }
                            
                            // Verificar se a partida é entre os jogadores em questão
                            if ((brancasId === playerId && pretasId === opponentId) || 
                                (brancasId === opponentId && pretasId === playerId)) {
                                
                                console.log(`Encontrada partida entre os jogadores: ${brancasId} vs ${pretasId}, resultado: ${partida.resultado}`);
                                
                                const isPlayerWhite = brancasId === playerId;
                                
                                if (partida.resultado === '1-0') {
                                    isPlayerWhite ? stats.victories++ : stats.losses++;
                                } else if (partida.resultado === '0-1') {
                                    isPlayerWhite ? stats.losses++ : stats.victories++;
                                } else if (partida.resultado === '1/2-1/2' || partida.resultado === '½-½') {
                                    stats.draws++;
                                }
                            }
                        });
                    }
                });
            }
        });

        console.log('Estatísticas calculadas:', stats);
        return stats;
    } catch (error) {
        console.error('Erro ao calcular estatísticas:', error);
        // Retornar estatísticas vazias em caso de erro para evitar quebrar a interface
        return { victories: 0, draws: 0, losses: 0 };
    }
}

// Adicionar evento para mudança de adversário
opponentSelect.addEventListener('change', async () => {
    const playerId = playerSelect.value;
    const opponentId = opponentSelect.value;
    
    if (playerId && opponentId) {
        try {
            console.log(`Calculando estatísticas para ${playerId} vs ${opponentId}`);
            const stats = await calculateHeadToHead(playerId, opponentId);
            
            victories.textContent = stats.victories;
            draws.textContent = stats.draws;
            losses.textContent = stats.losses;
            
            statsInfo.style.display = 'block';
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
            alert('Erro ao carregar estatísticas contra o adversário.');
            // Limpar estatísticas em caso de erro
            victories.textContent = '0';
            draws.textContent = '0';
            losses.textContent = '0';
        }
    } else {
        statsInfo.style.display = 'none';
    }
});

function displayFinalResults(resultados, jogadores) {
    const tbody = document.getElementById('resultados-tbody');
    tbody.innerHTML = '';

    resultados.forEach((resultado, index) => {
        // Encontrar o jogador na lista de jogadores do torneio
        const jogadorTorneio = jogadores.find(j => j.id === resultado.id);
        const tr = document.createElement('tr');
        
        // Usar o rating do jogador do torneio
        const ratingInicial = jogadorTorneio ? Number(jogadorTorneio.rating) : 0;
        const ratingAtualizado = ratingInicial + Number(resultado.variacaoRating);
        
        tr.innerHTML = `
            <td>${index + 1}º</td>
            <td>${UI.escapar(resultado.nome)}</td>
            <td>${UI.escapar(resultado.pontos)}</td>
            <td>${ratingInicial}</td>
            <td>${resultado.variacaoRating > 0 ? '+' : ''}${resultado.variacaoRating}</td>
            <td>${ratingAtualizado}</td>
        `;
        tbody.appendChild(tr);
    });
}
