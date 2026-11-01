// Variáveis globais
let torneioSelecionado = null;
let rodadasPresenciais = [];
let jogadoresGlobais = [];

// Verificar autenticação ao carregar
document.addEventListener('DOMContentLoaded', function() {
    const adminContent = document.getElementById('admin-content');
    const notAuthorized = document.getElementById('not-authorized');

    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // Usuário está logado como admin
            adminContent.style.display = 'block';
            notAuthorized.style.display = 'none';
            carregarTorneios();
        } else {
            // Usuário não autenticado
            adminContent.style.display = 'none';
            notAuthorized.style.display = 'block';
        }
    });
});

// Carregar lista de torneios sem resultado
async function carregarTorneios() {
    const db = firebase.firestore();
    const select = document.getElementById('torneio-select');

    try {
        const querySnapshot = await db.collection('torneio').get();
        
        querySnapshot.forEach((doc) => {
            const torneioData = doc.data();
            // Mostrar apenas torneios que estão em aberto (sem resultado)
            if (!torneioData.Resultado) {
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = torneioData.nome;
                select.appendChild(option);
            }
        });
    } catch (error) {
        console.error('Erro ao carregar torneios:', error);
        mostrarMensagem('Erro ao carregar torneios.', 'error');
    }
}

// Carregar torneio selecionado
async function carregarTorneio() {
    const db = firebase.firestore();
    const torneioId = document.getElementById('torneio-select').value;

    if (!torneioId) {
        alert('Selecione um torneio.');
        return;
    }

    try {
        const doc = await db.collection('torneio').doc(torneioId).get();
        
        if (doc.exists) {
            torneioSelecionado = doc.data();
            torneioSelecionado.id = doc.id;
            
            // Exibir informações do torneio
            exibirInformacoesTorneio();
            
            // Preparar rodadas para entrada manual
            prepararRodasPresenciais();
            
        } else {
            alert('Torneio não encontrado.');
        }
    } catch (error) {
        console.error('Erro ao carregar torneio:', error);
        alert('Erro ao carregar torneio.');
    }
}

// Exibir informações do torneio
function exibirInformacoesTorneio() {
    const infoDiv = document.getElementById('torneio-info');
    const infoContent = document.getElementById('info-content');

    const e = UI.escapar;
    infoContent.innerHTML = `
        <div><div class="text-body-secondary">Nome</div><div class="fw-semibold">${e(torneioSelecionado.nome)}</div></div>
        <div><div class="text-body-secondary">Formato</div><div class="fw-semibold">${torneioSelecionado.Formato === 'schuring' ? 'Schuring' : 'Suíço'}</div></div>
        <div><div class="text-body-secondary">Rodadas</div><div class="fw-semibold">${e(torneioSelecionado.etapas)}</div></div>
        <div><div class="text-body-secondary">Data</div><div class="fw-semibold">${UI.formatarData(torneioSelecionado.data)}</div></div>
        <div><div class="text-body-secondary">Jogadores</div><div class="fw-semibold">${torneioSelecionado.jogadores.length}</div></div>
    `;

    infoDiv.style.display = 'block';
    document.getElementById('dicaManual').classList.remove('d-none');
}

// Preparar rodadas para entrada manual
function prepararRodasPresenciais() {
    jogadoresGlobais = torneioSelecionado.jogadores.map(jogador => ({
        id: jogador.id,
        nome: jogador.nome,
        rating: jogador.rating
    }));

    // Adicionar BYE se número de jogadores for impar
    if (jogadoresGlobais.length % 2 !== 0) {
        jogadoresGlobais.push({
            id: 'bye',
            nome: 'BYE',
            rating: 0
        });
    }

    const numEtapas = parseInt(torneioSelecionado.etapas);
    rodadasPresenciais = [];

    for (let i = 1; i <= numEtapas; i++) {
        rodadasPresenciais.push({
            numero: i,
            partidas: []
        });
    }

    criarInterfaceRodadas();
}

// Criar interface das rodadas
function criarInterfaceRodadas() {
    const container = document.getElementById('rodadas-container');
    container.innerHTML = '';

    rodadasPresenciais.forEach((rodada, indiceRodada) => {
        const rodadaDiv = document.createElement('div');
        rodadaDiv.className = 'rodada';
        rodadaDiv.innerHTML = `<h3 class="h5">Rodada ${rodada.numero}</h3>`;

        // Calcular número de mesas
        const numMesas = Math.ceil(jogadoresGlobais.length / 2);

        for (let mesa = 0; mesa < numMesas; mesa++) {
            const partidaDiv = document.createElement('div');
            partidaDiv.className = 'partida';
            partidaDiv.innerHTML = `
                <div class="partida-header">Mesa ${mesa + 1}</div>
                <div class="partida-row">
                    <div class="partida-col">
                        <label><i class="bi bi-circle me-1"></i>Brancas</label>
                        <select class="jogador-brancas form-select form-select-sm" data-rodada="${indiceRodada}" data-mesa="${mesa}">
                            <option value="">Selecione jogador</option>
                            ${jogadoresGlobais.map(j => `<option value="${UI.escapar(j.id)}">${UI.escapar(j.nome)} (${UI.escapar(j.rating)})</option>`).join('')}
                        </select>
                    </div>
                    
                    <div class="partida-col">
                        <label><i class="bi bi-circle-fill me-1"></i>Pretas</label>
                        <select class="jogador-pretas form-select form-select-sm" data-rodada="${indiceRodada}" data-mesa="${mesa}">
                            <option value="">Selecione jogador</option>
                            ${jogadoresGlobais.map(j => `<option value="${UI.escapar(j.id)}">${UI.escapar(j.nome)} (${UI.escapar(j.rating)})</option>`).join('')}
                        </select>
                    </div>
                    
                    <div class="resultado-col">
                        <label>Resultado</label>
                        <select class="resultado-select form-select form-select-sm" data-rodada="${indiceRodada}" data-mesa="${mesa}">
                            <option value="">Selecione</option>
                            <option value="1-0">1-0</option>
                            <option value="1/2-1/2">½-½</option>
                            <option value="0-1">0-1</option>
                        </select>
                    </div>
                </div>
            `;
            rodadaDiv.appendChild(partidaDiv);

            // Adicionar listeners para BYE
            const brancasSelect = partidaDiv.querySelector('.jogador-brancas');
            const pretasSelect = partidaDiv.querySelector('.jogador-pretas');
            const resultadoSelect = partidaDiv.querySelector('.resultado-select');

            const atualizarResultadoBYE = () => {
                const brancasId = brancasSelect.value;
                const pretasId = pretasSelect.value;

                if (brancasId === 'bye' || pretasId === 'bye') {
                    // Se BYE está nas brancas, pretas ganham (0-1)
                    if (brancasId === 'bye') {
                        resultadoSelect.value = '0-1';
                    } else {
                        // Se BYE está nas pretas, brancas ganham (1-0)
                        resultadoSelect.value = '1-0';
                    }
                    resultadoSelect.disabled = true;
                } else {
                    resultadoSelect.disabled = false;
                    resultadoSelect.value = '';
                }
            };

            brancasSelect.addEventListener('change', atualizarResultadoBYE);
            pretasSelect.addEventListener('change', atualizarResultadoBYE);
        }

        container.appendChild(rodadaDiv);
    });

    // Adicionar botão de encerrar
    const encerrarButton = document.createElement('button');
    encerrarButton.innerHTML = '<i class="bi bi-flag-fill me-1"></i>Encerrar torneio';
    encerrarButton.className = 'btn btn-gold btn-lg botao-torneio';
    encerrarButton.addEventListener('click', async () => {
        const ok = await UI.confirmar('Encerrar o torneio agora?\nA classificação final será gravada e os ratings dos jogadores serão atualizados.', { titulo: 'Encerrar torneio', botao: 'Encerrar e gravar' });
        if (!ok) return;
        encerrarButton.disabled = true;
        await encerrarTorneioPresencial();
        // Se faltou algo ou a gravação falhou, permite tentar de novo
        if (!document.querySelector('.resultados-finais')) encerrarButton.disabled = false;
    });
    container.appendChild(encerrarButton);

    container.style.display = 'block';
}

// Encerrar torneio presencial
async function encerrarTorneioPresencial() {
    // Validar se todos os campos estão preenchidos
    const todasPartidas = document.querySelectorAll('.partida');
    let partidasValidas = 0;

    todasPartidas.forEach(partida => {
        const brancas = partida.querySelector('.jogador-brancas').value;
        const pretas = partida.querySelector('.jogador-pretas').value;
        const resultado = partida.querySelector('.resultado-select').value;

        // Contar partidas que têm pelo menos os jogadores selecionados
        if (brancas && pretas) {
            if (resultado) {
                partidasValidas++;
            }
        }
    });

    const totalPartidas = Array.from(todasPartidas).filter(p => {
        const brancas = p.querySelector('.jogador-brancas').value;
        const pretas = p.querySelector('.jogador-pretas').value;
        return brancas && pretas;
    }).length;

    if (partidasValidas !== totalPartidas) {
        alert('Por favor, preencha todos os resultados das partidas com jogadores selecionados.');
        return;
    }

    if (totalPartidas === 0) {
        alert('Por favor, selecione jogadores e resultados para as partidas.');
        return;
    }

    // Processar resultados
    const resultados = {};
    const historicoPartidas = {};

    for (let rodada = 0; rodada < rodadasPresenciais.length; rodada++) {
        const rodadaPartidas = [];
        const partidasRodada = document.querySelectorAll(`.partida-row`);
        let indexPartida = 0;

        partidasRodada.forEach((partida) => {
            const rodadaAttr = partida.querySelector('.jogador-brancas').dataset.rodada;
            const mesaAttr = partida.querySelector('.jogador-brancas').dataset.mesa;

            if (parseInt(rodadaAttr) === rodada) {
                const brancasId = partida.querySelector('.jogador-brancas').value;
                const pretasId = partida.querySelector('.jogador-pretas').value;
                const resultado = partida.querySelector('.resultado-select').value;

                if (brancasId && pretasId && resultado) {
                    const brancas = jogadoresGlobais.find(j => j.id === brancasId);
                    const pretas = jogadoresGlobais.find(j => j.id === pretasId);

                    rodadaPartidas.push({
                        brancas: {
                            id: brancasId,
                            nome: brancas.nome,
                            rating: brancas.rating
                        },
                        pretas: {
                            id: pretasId,
                            nome: pretas.nome,
                            rating: pretas.rating
                        },
                        resultado: resultado
                    });

                    // Atualizar resultados
                    if (!resultados[brancasId]) {
                        resultados[brancasId] = {
                            id: brancasId,
                            nome: brancas.nome,
                            pontos: 0,
                            vitorias: 0,
                            empates: 0,
                            sonnenbornBerger: 0,
                            variacaoRating: 0,
                            rating: brancas.rating
                        };
                    }
                    if (!resultados[pretasId]) {
                        resultados[pretasId] = {
                            id: pretasId,
                            nome: pretas.nome,
                            pontos: 0,
                            vitorias: 0,
                            empates: 0,
                            sonnenbornBerger: 0,
                            variacaoRating: 0,
                            rating: pretas.rating
                        };
                    }

                    // Processar resultado
                    switch (resultado) {
                        case '1-0':
                            resultados[brancasId].pontos += 1;
                            resultados[brancasId].vitorias++;
                            resultados[brancasId].sonnenbornBerger += resultados[pretasId].pontos;
                            break;
                        case '0-1':
                            resultados[pretasId].pontos += 1;
                            resultados[pretasId].vitorias++;
                            resultados[pretasId].sonnenbornBerger += resultados[brancasId].pontos;
                            break;
                        case '1/2-1/2':
                            resultados[brancasId].pontos += 0.5;
                            resultados[pretasId].pontos += 0.5;
                            resultados[brancasId].empates++;
                            resultados[pretasId].empates++;
                            resultados[brancasId].sonnenbornBerger += resultados[pretasId].pontos / 2;
                            resultados[pretasId].sonnenbornBerger += resultados[brancasId].pontos / 2;
                            break;
                    }

                    // Calcular variação de rating (Elo) - apenas se nenhum dos dois for BYE
                    if (brancasId !== 'bye' && pretasId !== 'bye') {
                        const K = 20;
                        const E = 1 / (1 + Math.pow(10, (resultados[pretasId].rating - resultados[brancasId].rating) / 400));
                        
                        let S = 0.5;
                        if (resultado === '1-0') S = 1;
                        else if (resultado === '0-1') S = 0;
                        
                        const variacao = K * (S - E);
                        resultados[brancasId].variacaoRating += variacao;
                        resultados[pretasId].variacaoRating -= variacao;
                    }
                }
            }
        });

        if (rodadaPartidas.length > 0) {
            historicoPartidas[`rodada${rodada + 1}`] = rodadaPartidas;
        }
    }

    // Arredondar variações de rating
    const resultadosArray = Object.values(resultados);
    resultadosArray.forEach(r => {
        r.variacaoRating = Math.round(r.variacaoRating);
        r.rating = Math.round(parseFloat(r.rating) + r.variacaoRating);
    });

    // Ordenar resultados
    resultadosArray.sort((a, b) => {
        if (b.pontos !== a.pontos) return b.pontos - a.pontos;
        if (b.vitorias !== a.vitorias) return b.vitorias - a.vitorias;
        if (b.sonnenbornBerger !== a.sonnenbornBerger) return b.sonnenbornBerger - a.sonnenbornBerger;
        return b.rating - a.rating;
    });

    try {
        const db = firebase.firestore();
        
        // Filtrar resultados para remover BYE
        const resultadosSemBYE = resultadosArray.filter(r => r.id !== 'bye');

        // Salvar resultados no Firestore
        await db.collection('torneio').doc(torneioSelecionado.id).update({
            Resultado: resultadosSemBYE,
            historicoPartidas: historicoPartidas
        });
        
        // Atualizar ratings dos jogadores (apenas dos que não são BYE)
        for (const jogador of resultadosSemBYE) {
            await db.collection('players').doc(jogador.id).update({
                Rating: jogador.rating
            });
        }
        
        // Exibir resultados finais (sem BYE)
        exibirResultadosFinais(resultadosSemBYE);
        
        mostrarMensagem('Torneio encerrado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao salvar os resultados do torneio: ', error);
        mostrarMensagem('Erro ao salvar os resultados do torneio.', 'error');
    }
}

// Exibir resultados finais
function exibirResultadosFinais(resultados) {
    const container = document.getElementById('rodadas-container');
    
    const resultadosContainer = document.createElement('div');
    resultadosContainer.className = 'resultados-finais';
    resultadosContainer.className = 'resultados-finais card p-3 mt-4';
    resultadosContainer.innerHTML = '<h2 class="h4"><i class="bi bi-trophy-fill me-2" style="color:var(--xd-gold)"></i>Resultados finais</h2>' +
        UI.podio(resultados.slice(0, 3).map(r => ({ nome: r.nome, detalhe: `${r.pontos} pts` })));
    
    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Posição</th>
                <th>Nome</th>
                <th>Pontos</th>
                <th>Vitórias</th>
                <th>S-B</th>
                <th>Variação Rating</th>
                <th>Rating Final</th>
            </tr>
        </thead>
        <tbody>
            ${resultados.map((r, i) => `
                <tr>
                    <td>${i + 1}</td>
                    <td>${UI.escapar(r.nome)}</td>
                    <td>${r.pontos.toFixed(1)}</td>
                    <td>${r.vitorias}</td>
                    <td>${r.sonnenbornBerger.toFixed(2)}</td>
                    <td>${r.variacaoRating > 0 ? '+' : ''}${r.variacaoRating}</td>
                    <td>${r.rating}</td>
                </tr>
            `).join('')}
        </tbody>
    `;
    
    resultadosContainer.appendChild(table);
    container.appendChild(resultadosContainer);
}

// Mostrar mensagem
function mostrarMensagem(texto, tipo) {
    UI.toast(texto, tipo === 'error' ? 'danger' : tipo);
}
