// Funções específicas para o sistema Schuring
function emparceirarSchuring(jogadores) {
    console.log("Iniciando emparceiramento Schuring");
    
    // Adicionar jogador "BYE" se necessário
    let temBYE = false;
    if (jogadores.length % 2 !== 0) {
        temBYE = true;
        jogadores.push({ 
            id: 'bye',
            nome: 'BYE',
            rating: 2000,
        });
    }

    const numJogadores = jogadores.length;
    console.log(`Número de jogadores: ${numJogadores}`);

    // Criar tabela de jogos (algoritmo de round-robin)
    function gerarRodadasSchuring() {
        const rodadas = [];
        const meio = Math.floor(numJogadores / 2);
        const jogadoresFixos = jogadores.slice(0, 1);
        const jogadoresRotativos = jogadores.slice(1);

        for (let rodada = 0; rodada < numJogadores - 1; rodada++) {
            const rodadaAtual = [];
            
            // Emparceirar jogadores
            for (let i = 0; i < meio; i++) {
                const j1 = i === 0 ? jogadoresFixos[0] : jogadoresRotativos[i - 1];
                const j2 = jogadoresRotativos[numJogadores - 2 - i];
                
                // Alternar cores baseado na rodada e posição
                const par = rodada % 2 === 0 ? [j1, j2] : [j2, j1];
                rodadaAtual.push(par);
            }
            
            rodadas.push(rodadaAtual);

            // Rotacionar jogadores (exceto o primeiro)
            jogadoresRotativos.unshift(jogadoresRotativos.pop());
        }

        return rodadas;
    }

    const rodadas = gerarRodadasSchuring();
    console.log("Rodadas geradas:", rodadas);

    // Criar interface para as rodadas
    const rodadasContainer = document.getElementById('rodadas-container');
    rodadasContainer.innerHTML = '';

    rodadas.forEach((rodada, index) => {
        const rodadaDiv = document.createElement('div');
        rodadaDiv.className = 'rodada';
        rodadaDiv.innerHTML = `<h3>Rodada ${index + 1}</h3>`;
        
        const table = document.createElement('table');
        table.className = 'table align-middle';

        // Separar partidas normais das partidas com BYE
        const partidasNormais = rodada.filter(partida => 
            partida[0].nome !== 'BYE' && partida[1].nome !== 'BYE'
        );
        const partidasBYE = rodada.filter(partida => 
            partida[0].nome === 'BYE' || partida[1].nome === 'BYE'
        );
        
        // Combinar as partidas com BYE no final
        const todasPartidas = [...partidasNormais, ...partidasBYE];

        table.innerHTML = `
            <thead>
                <tr>
                    <th>Mesa</th>
                    <th>Brancas</th>
                    <th>Pretas</th>
                    <th>Resultado</th>
                </tr>
            </thead>
            <tbody>
                ${todasPartidas.map((partida, mesa) => {
                    const temBYE = partida[0].nome === 'BYE' || partida[1].nome === 'BYE';
                    const resultadoBYE = temBYE ? (partida[0].nome === 'BYE' ? '0-1' : '1-0') : '';
                    
                    return `
                        <tr>
                            <td>${mesa + 1}</td>
                            <td class="${partida[0].nome === 'BYE' ? 'text-body-secondary' : 'fw-semibold'}">${UI.escapar(partida[0].nome)}</td>
                            <td class="${partida[1].nome === 'BYE' ? 'text-body-secondary' : 'fw-semibold'}">${UI.escapar(partida[1].nome)}</td>
                            <td>
                                <select class="resultado-select" 
                                        data-brancas-id="${UI.escapar(partida[0].id)}" 
                                        data-pretas-id="${UI.escapar(partida[1].id)}"
                                        ${temBYE ? 'disabled' : ''}>
                                    <option value="" ${(!temBYE && !resultadoBYE) ? 'selected' : ''}>Selecione</option>
                                    <option value="1-0" ${resultadoBYE === '1-0' ? 'selected' : ''}>1-0</option>
                                    <option value="1/2-1/2">1/2-1/2</option>
                                    <option value="0-1" ${resultadoBYE === '0-1' ? 'selected' : ''}>0-1</option>
                                </select>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        `;
        rodadaDiv.appendChild(table);
        rodadasContainer.appendChild(rodadaDiv);
    });

    // Adicionar botão de encerrar torneio
    const encerrarButton = document.createElement('button');
    encerrarButton.innerHTML = '<i class="bi bi-flag-fill me-1"></i>Encerrar torneio';
    encerrarButton.className = 'btn btn-gold btn-lg botao-torneio';
    encerrarButton.addEventListener('click', async function() {
        const todosPreenchidos = [...document.querySelectorAll('.resultado-select')]
            .every(select => select.disabled || select.value !== '');

        if (todosPreenchidos) {
            const ok = await UI.confirmar('Encerrar o torneio agora?\nA classificação final será gravada e os ratings dos jogadores serão atualizados.', { titulo: 'Encerrar torneio', botao: 'Encerrar e gravar' });
            if (!ok) return;
            encerrarButton.disabled = true;
            const gravou = await encerrarTorneioSchuring(jogadores, rodadas);
            // Se a gravação falhou, permite tentar de novo
            if (!gravou) encerrarButton.disabled = false;
        } else {
            alert('Por favor, preencha todos os resultados das partidas.');
        }
    });
    rodadasContainer.appendChild(encerrarButton);
    ProgressoTorneio.salvar();
}

async function encerrarTorneioSchuring(jogadores, rodadas) {
    // Calcular pontos dos jogadores
    const resultados = jogadores.map(jogador => ({
        id: jogador.id,
        nome: jogador.nome,
        pontos: 0,
        vitorias: 0,
        empates: 0,
        sonnenbornBerger: 0,
        variacaoRating: 0,
        rating: jogador.rating || 0
    }));

    // Processar resultados de todas as rodadas
    document.querySelectorAll('.rodada').forEach(rodada => {
        rodada.querySelectorAll('.resultado-select').forEach(select => {
            const brancasId = select.dataset.brancasId;
            const pretasId = select.dataset.pretasId;
            const resultado = select.value;

            const resultadoBrancas = resultados.find(r => r.id === brancasId);
            const resultadoPretas = resultados.find(r => r.id === pretasId);

            if (!resultadoBrancas || !resultadoPretas) return;

            // Calcular pontos e vitórias
            switch (resultado) {
                case '1-0':
                    resultadoBrancas.pontos += 1;
                    resultadoBrancas.vitorias++;
                    resultadoBrancas.sonnenbornBerger += resultadoPretas.pontos;
                    break;
                case '0-1':
                    resultadoPretas.pontos += 1;
                    resultadoPretas.vitorias++;
                    resultadoPretas.sonnenbornBerger += resultadoBrancas.pontos;
                    break;
                case '1/2-1/2':
                    resultadoBrancas.pontos += 0.5;
                    resultadoPretas.pontos += 0.5;
                    resultadoBrancas.empates++;
                    resultadoPretas.empates++;
                    resultadoBrancas.sonnenbornBerger += resultadoPretas.pontos / 2;
                    resultadoPretas.sonnenbornBerger += resultadoBrancas.pontos / 2;
                    break;
            }

            // Calcular variação de rating
            if (brancasId !== 'bye' && pretasId !== 'bye') {
                const K = 20;
                const E = 1 / (1 + Math.pow(10, (resultadoPretas.rating - resultadoBrancas.rating) / 400));
                
                let S = 0.5; // empate por padrão
                if (resultado === '1-0') S = 1;
                else if (resultado === '0-1') S = 0;
                
                const variacao = K * (S - E);
                resultadoBrancas.variacaoRating += variacao;
                resultadoPretas.variacaoRating -= variacao;
            }
        });
    });

    // Arredondar variações de rating
    resultados.forEach(r => {
        r.variacaoRating = Math.round(r.variacaoRating);
        r.rating = Math.round(parseFloat(r.rating) + r.variacaoRating);
    });

    // Ordenar resultados
    resultados.sort((a, b) => {
        if (b.pontos !== a.pontos) return b.pontos - a.pontos;
        if (b.vitorias !== a.vitorias) return b.vitorias - a.vitorias;
        if (b.sonnenbornBerger !== a.sonnenbornBerger) return b.sonnenbornBerger - a.sonnenbornBerger;
        return b.rating - a.rating;
    });

    // Coletar histórico de partidas
    const historicoPartidas = {};
    document.querySelectorAll('.rodada').forEach((rodada, indiceRodada) => {
        const partidas = [];
        rodada.querySelectorAll('.resultado-select').forEach(select => {
            const brancasId = select.dataset.brancasId;
            const pretasId = select.dataset.pretasId;
            const resultado = select.value;
            
            const brancas = jogadores.find(j => j.id === brancasId);
            const pretas = jogadores.find(j => j.id === pretasId);
            
            partidas.push({
                brancas: {
                    id: brancasId,
                    nome: brancas ? brancas.nome : 'BYE',
                    rating: brancas ? brancas.rating : 0
                },
                pretas: {
                    id: pretasId,
                    nome: pretas ? pretas.nome : 'BYE',
                    rating: pretas ? pretas.rating : 0
                },
                resultado: resultado
            });
        });
        
        if (partidas.length > 0) {
            historicoPartidas[`rodada${indiceRodada + 1}`] = partidas;
        }
    });

    try {
        const torneioId = document.getElementById('torneio-select').value;
        
        // Filtrar resultados para remover BYE
        const resultadosParaSalvar = resultados.filter(r => r.id !== 'bye');

        // Classificação e ratings gravados juntos (tudo-ou-nada)
        const gravou = await ProgressoTorneio.gravarEncerramento(torneioId, resultadosParaSalvar, historicoPartidas);
        if (!gravou) return false;
        
        // Exibir resultados finais na interface
        const resultadosContainer = document.createElement('div');
        resultadosContainer.className = 'resultados-finais';
        resultadosContainer.innerHTML = '<h2 class="h4"><i class="bi bi-trophy-fill me-2" style="color:var(--xd-gold)"></i>Resultados finais</h2>' +
            UI.podio(resultadosParaSalvar.slice(0, 3).map(r => ({ nome: r.nome, detalhe: `${r.pontos} pts` })));
        
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
                ${resultadosParaSalvar.map((r, i) => `
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
        document.getElementById('rodadas-container').appendChild(resultadosContainer);
        
        alert('Torneio encerrado com sucesso!');
        return true;
    } catch (error) {
        console.error('Erro ao salvar os resultados do torneio: ', error);
        alert('Erro ao salvar os resultados do torneio. Nada foi gravado e o progresso continua salvo neste aparelho; tente encerrar de novo.');
        return false;
    }
}
