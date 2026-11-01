// Funções específicas para o sistema Suíço

// Pares exibidos em cada rodada (com os pontos da época), usados para retomar o torneio
let paresPorRodada = [];

function emparceirarSuico(jogadoresIniciais, rodadaAtual = 1) {
    console.log(`=== Iniciando Rodada ${rodadaAtual} ===`);
    
    if (rodadaAtual > torneioData.etapas) {
        alert('O torneio está finalizado');
        return;
    }

    // Primeira rodada: inicializar jogadores
    if (rodadaAtual === 1) {
        // Inicializar jogadores globais
        jogadoresGlobais = jogadoresIniciais.map(jogador => ({
            id: jogador.id,
            nome: jogador.nome,
            rating: jogador.rating,
            pontos: 0,
            adversariosEnfrentados: [],
            historiaCores: []
        }));

        // Criar emparceiramentos da primeira rodada
        const emparceiramentos = emparceirarPrimeiraRodada(jogadoresGlobais);

        // Criar interface da rodada
        criarInterfaceRodada(emparceiramentos, rodadaAtual);
        return;
    }

    // Para as próximas rodadas
    const gruposPorPontuacao = agruparJogadoresPorPontuacao(jogadoresGlobais);
    
   
    const emparceiramentos = emparceirarRodada(gruposPorPontuacao, rodadaAtual);
    if (emparceiramentos.length === 0) {
        alert(`Erro: não foi possível emparceirar a rodada ${rodadaAtual} sem repetir adversários. Verifique o número de rodadas do torneio.`);
    }
    criarInterfaceRodada(emparceiramentos, rodadaAtual);
}

// Função para emparceirar a primeira rodada (por rating)
function emparceirarPrimeiraRodada(jogadores) {
    console.log('Emparceirando primeira rodada...');
    
    // Ordenar jogadores por rating
    const jogadoresOrdenados = [...jogadores].sort((a, b) => b.rating - a.rating);
    console.log('Jogadores ordenados por rating:', jogadoresOrdenados.map(j => `${j.nome} (${j.rating})`));
    
    // O jogador top é o primeiro da lista ordenada por rating
    const jogadorTop = jogadoresOrdenados[0];
    console.log(`Jogador top na primeira rodada: ${jogadorTop.nome} (${jogadorTop.rating})`);
    
    // Dividir em dois grupos
    const meio = Math.floor(jogadoresOrdenados.length / 2);
    const grupoSuperior = jogadoresOrdenados.slice(0, meio);
    const grupoInferior = jogadoresOrdenados.slice(meio);
    
    console.log('Grupo Superior:', grupoSuperior.map(j => `${j.nome} (${j.rating})`));
    console.log('Grupo Inferior:', grupoInferior.map(j => `${j.nome} (${j.rating})`));
    
    // Criar emparceiramentos
    const emparceiramentos = [];
    for (let i = 0; i < grupoSuperior.length && i < grupoInferior.length; i++) {
        // Caso especial para o jogador top: sempre de brancas na primeira rodada
        if (grupoSuperior[i].id === jogadorTop.id) {
            emparceiramentos.push([grupoSuperior[i], grupoInferior[i]]);
            console.log(`Mesa ${i+1}: ${grupoSuperior[i].nome} (B - TOP) vs ${grupoInferior[i].nome} (P)`);
            
            // Garantir que o histórico de cores seja inicializado corretamente
            grupoSuperior[i].historiaCores = [true];  // Jogador top começa de brancas
            grupoInferior[i].historiaCores = [false];
            console.log(`HISTÓRICO INICIAL: Jogador top ${grupoSuperior[i].nome} iniciado com BRANCAS`);
        }
        // Para os demais, alternar cores: ímpares de brancas, pares de pretas para o grupo superior
        else if (i % 2 === 0) {
            emparceiramentos.push([grupoSuperior[i], grupoInferior[i]]);
            console.log(`Mesa ${i+1}: ${grupoSuperior[i].nome} (B) vs ${grupoInferior[i].nome} (P)`);
            grupoSuperior[i].historiaCores = [true];
            grupoInferior[i].historiaCores = [false];
        } else {
            emparceiramentos.push([grupoInferior[i], grupoSuperior[i]]);
            console.log(`Mesa ${i+1}: ${grupoInferior[i].nome} (B) vs ${grupoSuperior[i].nome} (P)`);
            grupoInferior[i].historiaCores = [true];
            grupoSuperior[i].historiaCores = [false];
        }
        
        // Atualizar adversários
        const [brancas, pretas] = emparceiramentos[emparceiramentos.length - 1];
        brancas.adversariosEnfrentados = [pretas.id];
        pretas.adversariosEnfrentados = [brancas.id];
    }

    // Tratar caso de número ímpar de jogadores
    if (jogadoresOrdenados.length % 2 !== 0) {
        const jogadorBYE = {
            id: 'bye',
            nome: 'BYE',
            rating: 0,
            pontos: -9999,
            adversariosEnfrentados: [],
            historiaCores: []
        };

        const ultimoJogador = jogadoresOrdenados[jogadoresOrdenados.length - 1];
        emparceiramentos.push([ultimoJogador, jogadorBYE]);
        ultimoJogador.adversariosEnfrentados = ['bye'];
        ultimoJogador.historiaCores = [true]; // Jogador contra BYE sempre de brancas
        console.log(`Última mesa: ${ultimoJogador.nome} vs BYE`);
    }

    // Log do histórico de cores
    console.log('\n=== Histórico de Cores após Primeira Rodada ===');
    jogadores.forEach(jogador => {
        if (jogador.nome !== 'BYE') {
            const totalBrancas = jogador.historiaCores.filter(cor => cor === true).length;
            const totalPartidas = jogador.historiaCores.length;
            const corAtual = jogador.historiaCores[0] ? 'brancas' : 'pretas';
            console.log(`${jogador.nome}: ${totalBrancas} brancas em ${totalPartidas} partidas (${corAtual})`);
            
            if (jogador.id === jogadorTop.id) {
                console.log(`CONFIRMAÇÃO: Jogador top ${jogador.nome} está com histórico correto: ${corAtual}`);
            }
        }
    });
    console.log('=====================================\n');

    return emparceiramentos;
}

// Função para agrupar jogadores por pontuação
function agruparJogadoresPorPontuacao(jogadores) {
    // Remover jogador BYE se existir
    const jogadoresAtivos = jogadores.filter(j => j.id !== 'bye');

    // Criar objeto para armazenar grupos
    const grupos = {};

    // Agrupar jogadores por pontuação
    jogadoresAtivos.forEach(jogador => {
        const pontos = jogador.pontos || 0;
        if (!grupos[pontos]) {
            grupos[pontos] = [];
        }
        grupos[pontos].push(jogador);
    });

    // Ordenar jogadores dentro de cada grupo por rating
    Object.keys(grupos).forEach(pontuacao => {
        grupos[pontuacao].sort((a, b) => b.rating - a.rating);
    });

    // Log detalhado dos grupos
    console.log('\n=== Grupos por Pontuação ===');
    Object.keys(grupos)
        .sort((a, b) => Number(b) - Number(a)) // Ordenar pontuações em ordem decrescente
        .forEach(pontuacao => {
            console.log(`\nGrupo ${pontuacao} pontos:`);
            grupos[pontuacao].forEach(jogador => {
                console.log(`- ${jogador.nome} (Rating: ${jogador.rating})`);
            });
        });
    console.log('=====================================\n');

    return grupos;
}

// Implementação do algoritmo húngaro para encontrar emparceiramento ótimo
function hungarianAlgorithm(costMatrix) {
    const n = costMatrix.length;
    const m = costMatrix[0].length;
    const marked = Array(n).fill().map(() => Array(m).fill(false));
    const rowCover = Array(n).fill(false);
    const colCover = Array(m).fill(false);
    
    // Passo 1: Reduzir linhas
    for (let i = 0; i < n; i++) {
        const minVal = Math.min(...costMatrix[i]);
        for (let j = 0; j < m; j++) {
            costMatrix[i][j] -= minVal;
        }
    }

    // Passo 2: Reduzir colunas
    for (let j = 0; j < m; j++) {
        const minVal = Math.min(...costMatrix.map(row => row[j]));
        for (let i = 0; i < n; i++) {
            costMatrix[i][j] -= minVal;
        }
    }

    // Passo 3: Cobrir todos os zeros com o mínimo de linhas
    let step = 3;
    while (step !== -1) {
        switch (step) {
            case 3:
                let independentZeros = 0;
                for (let i = 0; i < n; i++) {
                    for (let j = 0; j < m; j++) {
                        if (costMatrix[i][j] === 0 && !rowCover[i] && !colCover[j]) {
                            marked[i][j] = true;
                            rowCover[i] = true;
                            colCover[j] = true;
                            independentZeros++;
                        }
                    }
                }
                rowCover.fill(false);
                colCover.fill(false);
                step = independentZeros >= n ? -1 : 4;
                break;

            case 4:
                let zero = findUncoveredZero(costMatrix, rowCover, colCover);
                if (zero === null) {
                    step = 6;
                } else {
                    marked[zero.row][zero.col] = true;
                    let starCol = findStarInRow(marked, zero.row);
                    if (starCol === -1) {
                        step = 5;
                    } else {
                        rowCover[zero.row] = true;
                        colCover[starCol] = false;
                    }
                }
                break;

            case 5:
                step = augmentPath(marked, rowCover, colCover, zero);
                break;

            case 6:
                updateCostMatrix(costMatrix, rowCover, colCover);
                step = 4;
                break;
        }
    }

    // Retornar o emparelhamento
    const matching = [];
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < m; j++) {
            if (marked[i][j]) {
                matching.push([i, j]);
            }
        }
    }
    return matching;
}

function findUncoveredZero(matrix, rowCover, colCover) {
    for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[0].length; j++) {
            if (matrix[i][j] === 0 && !rowCover[i] && !colCover[j]) {
                return { row: i, col: j };
            }
        }
    }
    return null;
}

function findStarInRow(marked, row) {
    for (let j = 0; j < marked[row].length; j++) {
        if (marked[row][j]) return j;
    }
    return -1;
}

function updateCostMatrix(costMatrix, rowCover, colCover) {
    let minVal = Infinity;
    for (let i = 0; i < costMatrix.length; i++) {
        for (let j = 0; j < costMatrix[0].length; j++) {
            if (!rowCover[i] && !colCover[j]) {
                minVal = Math.min(minVal, costMatrix[i][j]);
            }
        }
    }
    
    for (let i = 0; i < costMatrix.length; i++) {
        for (let j = 0; j < costMatrix[0].length; j++) {
            if (rowCover[i]) costMatrix[i][j] += minVal;
            if (!colCover[j]) costMatrix[i][j] -= minVal;
        }
    }
}

function augmentPath(marked, rowCover, colCover, zero) {
    let path = [[zero.row, zero.col]];
    let done = false;
    
    while (!done) {
        let row = findStarInCol(marked, path[path.length - 1][1]);
        if (row === -1) {
            done = true;
        } else {
            path.push([row, path[path.length - 1][1]]);
            let col = findPrimeInRow(marked, row);
            path.push([row, col]);
        }
    }
    
    // Converter marcações
    for (let [i, j] of path) {
        marked[i][j] = !marked[i][j];
    }
    
    rowCover.fill(false);
    colCover.fill(false);
    
    // Limpar marcações primas
    for (let i = 0; i < marked.length; i++) {
        for (let j = 0; j < marked[0].length; j++) {
            if (!marked[i][j]) {
                marked[i][j] = false;
            }
        }
    }
    
    return 3;
}

function findStarInCol(marked, col) {
    for (let i = 0; i < marked.length; i++) {
        if (marked[i][col]) return i;
    }
    return -1;
}

function findPrimeInRow(marked, row) {
    for (let j = 0; j < marked[row].length; j++) {
        if (marked[row][j]) return j;
    }
    return -1;
}

// Função para emparceirar rodadas após a primeira
function emparceirarRodada(gruposPorPontuacao, rodadaAtual) {
    const emparceiramentos = [];
    const jogadoresEmparelhados = new Set();
    
    // Obter pontuações em ordem decrescente
    const pontuacoes = Object.keys(gruposPorPontuacao)
        .map(Number)
        .sort((a, b) => b - a);

    // Função para verificar se jogadores já se enfrentaram
    function jaJogaram(jogador1, jogador2) {
        return jogador1.adversariosEnfrentados.includes(jogador2.id);
    }

    // Função para determinar cores ideais
    function determinarCores(jogador1, jogador2) {
        // Encontrar o jogador com maior pontuação e rating
        const jogadorTop = todosJogadores
            .filter(j => j.id !== 'bye')
            .sort((a, b) => {
                if (a.pontos !== b.pontos) return b.pontos - a.pontos;
                return b.rating - a.rating;
            })[0];

        // Se um dos jogadores é o top, determinar suas cores primeiro
        if (jogador1.id === jogadorTop.id || jogador2.id === jogadorTop.id) {
            const jogadorTopObj = jogador1.id === jogadorTop.id ? jogador1 : jogador2;
            const isJogador1Top = jogador1.id === jogadorTop.id;
            
            console.log(`\n=== Determinando Cores para Jogador Top ===`);
            console.log(`Jogador top: ${jogadorTopObj.nome}`);
            console.log(`Rodada atual: ${jogadorTopObj.historiaCores.length + 1}`);
            console.log(`Histórico atual: [${jogadorTopObj.historiaCores.map(cor => cor ? 'B' : 'P').join(', ')}]`);
            
            // Forçar alternância baseada no número da rodada
            const rodadaAtual = jogadorTopObj.historiaCores.length + 1;
            const deveTerBrancas = rodadaAtual % 2 === 1; // Ímpar = brancas, Par = pretas
            
            console.log(`Rodada ${rodadaAtual} (${deveTerBrancas ? 'Ímpar' : 'Par'})`);
            console.log(`Jogador top deve jogar de: ${deveTerBrancas ? 'brancas' : 'pretas'}`);
            
            jogador1DeBrancas = isJogador1Top ? deveTerBrancas : !deveTerBrancas;
            
            console.log(`Resultado final: ${jogadorTopObj.nome} jogará de ${jogador1DeBrancas === isJogador1Top ? 'brancas' : 'pretas'}`);
            console.log('=====================================\n');
        }

        // Para outros jogadores, manter a lógica original
        if (!jogador1.historiaCores || !jogador2.historiaCores || 
            jogador1.historiaCores.length === 0 || jogador2.historiaCores.length === 0) {
            return Math.random() < 0.5;
        }

        const ultimaCorJ1 = jogador1.historiaCores[jogador1.historiaCores.length - 1];
        const ultimaCorJ2 = jogador2.historiaCores[jogador2.historiaCores.length - 1];

        if (ultimaCorJ1 !== ultimaCorJ2) {
            return ultimaCorJ1 === false;
        }

        return Math.random() < 0.5;
    }

    // Pegar todos os jogadores e ordenar por pontuação (crescente) e rating (crescente)
    let todosJogadores = [];
    pontuacoes.forEach(pontuacao => {
        todosJogadores = [...todosJogadores, ...gruposPorPontuacao[pontuacao]];
    });

    // Escolher BYE e pares "olhando adiante": a rodada só é aceita se ainda for possível
    // completar todas as rodadas restantes sem repetir adversários nem repetir BYE.
    const rodadasRestantes = parseInt(torneioData.etapas) - rodadaAtual;
    const escolha = encontrarEmparceiramentoViavel(todosJogadores, rodadasRestantes);

    let emparceiramentoBYE = null;
    if (escolha.bye) {
        const jogadorParaBYE = escolha.bye;
        jogadoresEmparelhados.add(jogadorParaBYE.id);
        const jogadorBYE = {
            id: 'bye',
            nome: 'BYE',
            rating: 0,
            pontos: -9999,
            adversariosEnfrentados: [],
            historiaCores: []
        };
        emparceiramentoBYE = [jogadorParaBYE, jogadorBYE];
        jogadorParaBYE.adversariosEnfrentados.push('bye');
        jogadorParaBYE.historiaCores.push(true);
        console.log(`Emparelhado com BYE: ${jogadorParaBYE.nome} (${jogadorParaBYE.pontos}pts)`);
    }

    const emparceiramentosFinal = escolha.pares;
    
    if (!emparceiramentosFinal) {
        console.error('ERRO FATAL: Não foi possível encontrar um emparceiramento válido');
        return [];
    }

    // Ordenar emparceiramentos por pontuação máxima da mesa
    emparceiramentosFinal.sort((a, b) => {
        const maxPontosA = Math.max(a[0].pontos || 0, a[1].pontos || 0);
        const maxPontosB = Math.max(b[0].pontos || 0, b[1].pontos || 0);
        
        if (maxPontosA !== maxPontosB) {
            return maxPontosB - maxPontosA; // Ordem decrescente de pontos
        }
        
        // Se pontos iguais, desempatar por rating máximo
        const maxRatingA = Math.max(a[0].rating || 0, a[1].rating || 0);
        const maxRatingB = Math.max(b[0].rating || 0, b[1].rating || 0);
        return maxRatingB - maxRatingA;
    });

    console.log('\n=== Emparceiramentos Ordenados por Pontuação ===');
    emparceiramentosFinal.forEach((par, index) => {
        console.log(`Mesa ${index + 1}: ${par[0].nome} (${par[0].pontos}pts) vs ${par[1].nome} (${par[1].pontos}pts)`);
    });
    console.log('=============================================\n');

    // Encontrar o jogador top
    const jogadorTop = todosJogadores
        .filter(j => j.id !== 'bye')
        .sort((a, b) => {
            if (a.pontos !== b.pontos) return b.pontos - a.pontos;
            return b.rating - a.rating;
        })[0];

    // Verificar se o jogador top está na mesa 1
    const mesa1 = emparceiramentosFinal[0];
    const jogadorTopNaMesa1 = mesa1[0].id === jogadorTop.id || mesa1[1].id === jogadorTop.id;

    if (jogadorTopNaMesa1) {
        // Determinar última cor jogada pelo jogador top
        const ultimaCor = jogadorTop.historiaCores.length > 0 
            ? jogadorTop.historiaCores[jogadorTop.historiaCores.length - 1]
            : null;

        // Determinar se o jogador top está como brancas na mesa 1
        const topEstaDeBrancas = mesa1[0].id === jogadorTop.id;

        // Se não é a primeira rodada, garantir alternância
        if (ultimaCor !== null) {
            const precisaTrocar = (ultimaCor && topEstaDeBrancas) || (!ultimaCor && !topEstaDeBrancas);
            
            if (precisaTrocar) {
                // Inverter jogadores da mesa 1
                emparceiramentosFinal[0] = [mesa1[1], mesa1[0]];
            }
        } else {
            // Na primeira rodada, garantir que o jogador top jogue de brancas
            if (!topEstaDeBrancas) {
                emparceiramentosFinal[0] = [mesa1[1], mesa1[0]];
            }
        }
    }

    // Balancear cores para todos os jogadores
    const emparceiramentosBalanceados = balancearCores(emparceiramentosFinal, jogadorTop);

    // Processar os emparceiramentos encontrados
    emparceiramentosBalanceados.forEach(([jogador1, jogador2]) => {
        // Atualizar históricos
        jogador1.historiaCores.push(true);  // Brancas
        jogador2.historiaCores.push(false); // Pretas
        jogador1.adversariosEnfrentados.push(jogador2.id);
        jogador2.adversariosEnfrentados.push(jogador1.id);
        
        // Marcar jogadores como emparelhados
        jogadoresEmparelhados.add(jogador1.id);
        jogadoresEmparelhados.add(jogador2.id);
    });

    // Adicionar o emparceiramento BYE se existir
    const emparceiramentosFinais = emparceiramentoBYE 
        ? [...emparceiramentosBalanceados, emparceiramentoBYE]
        : emparceiramentosBalanceados;

    return emparceiramentosFinais;
}

// Escolhe o BYE e os pares da rodada seguindo as prioridades do suíço (mesmo grupo de
// pontos, menor diferença de pontos) e garantindo que o torneio continue viável: depois
// desta rodada ainda tem que existir alguma forma de jogar as `rodadasRestantes` sem
// repetir adversários e sem dar um segundo BYE a ninguém. Sem essa verificação o
// emparceiramento podia "se encurralar" (ex.: 8 jogadores e 6 rodadas, a 6ª rodada ficava
// impossível em ~12% dos torneios).
// Retorna { pares: [[j1, j2], ...] | null, bye: jogador | null }.
function encontrarEmparceiramentoViavel(jogadores, rodadasRestantes) {
    const LIMITE_PASSOS = 300000; // proteção contra buscas longas em torneios muito grandes
    let passos = 0;
    const ESTOUROU = {};

    const chavePar = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
    const ids = jogadores.map(j => j.id);
    const porId = Object.fromEntries(jogadores.map(j => [j.id, j]));
    const jogadosInicial = new Set();
    const byesInicial = new Set();
    jogadores.forEach(j => j.adversariosEnfrentados.forEach(adv => {
        if (adv === 'bye') byesInicial.add(j.id);
        else jogadosInicial.add(chavePar(j.id, adv));
    }));

    // Percorre emparceiramentos possíveis de `livres` (sem repetir confrontos) e chama
    // aoCompletar(pares) para cada um; para assim que aoCompletar retornar true.
    // Com `ordenarCandidatos` usa a ordem de prioridade do suíço; sem ela, escolhe primeiro
    // o jogador com menos adversários disponíveis (mais rápido para só testar viabilidade).
    // `podar(pares)`, se informado, descarta caminhos parciais que já não podem ser melhores.
    function enumerar(livres, jogados, ordenarCandidatos, aoCompletar, pares = [], podar = null) {
        if (++passos > LIMITE_PASSOS) throw ESTOUROU;
        if (livres.length === 0) return aoCompletar(pares);

        let pivo;
        let candidatos;
        if (ordenarCandidatos) {
            pivo = livres[0];
            candidatos = ordenarCandidatos(pivo, livres.slice(1).filter(id => !jogados.has(chavePar(pivo, id))));
        } else {
            let menor = Infinity;
            for (const id of livres) {
                const disp = livres.filter(o => o !== id && !jogados.has(chavePar(id, o)));
                if (disp.length < menor) { menor = disp.length; pivo = id; candidatos = disp; }
                if (menor === 0) return false;
            }
        }

        for (const adv of candidatos) {
            const resto = livres.filter(id => id !== pivo && id !== adv);
            pares.push([pivo, adv]);
            if (!(podar && podar(pares)) && enumerar(resto, jogados, ordenarCandidatos, aoCompletar, pares, podar)) return true;
            pares.pop();
        }
        return false;
    }

    function comNovosPares(jogados, pares) {
        const novo = new Set(jogados);
        pares.forEach(([a, b]) => novo.add(chavePar(a, b)));
        return novo;
    }

    // Ainda dá para jogar `rodadas` rodadas a partir deste estado?
    const memo = new Map();
    function viavel(rodadas, jogados, byes) {
        if (rodadas <= 0) return true;
        const chave = `${rodadas}#${[...jogados].sort().join(',')}#${[...byes].sort().join(',')}`;
        if (memo.has(chave)) return memo.get(chave);

        let ok = false;
        const opcoesBye = ids.length % 2 === 0 ? [null] : ids.filter(id => !byes.has(id));
        for (const bye of opcoesBye) {
            const livres = bye === null ? ids : ids.filter(id => id !== bye);
            const novosByes = bye === null ? byes : new Set([...byes, bye]);
            if (enumerar(livres, jogados, null, pares => viavel(rodadas - 1, comNovosPares(jogados, pares), novosByes))) {
                ok = true;
                break;
            }
        }
        memo.set(chave, ok);
        return ok;
    }

    // Ordem de prioridade dos adversários: mesmo grupo de pontos, menor diferença de pontos,
    // e sorteio entre os equivalentes (como no algoritmo anterior)
    const sorteio = Object.fromEntries(ids.map(id => [id, Math.random()]));
    function ordenarPorPrioridade(pivo, candidatos) {
        const p = porId[pivo].pontos;
        return [...candidatos].sort((a, b) => {
            const pa = porId[a].pontos, pb = porId[b].pontos;
            const mesmoA = pa === p, mesmoB = pb === p;
            if (mesmoA !== mesmoB) return mesmoB - mesmoA;
            const difA = Math.abs(pa - p), difB = Math.abs(pb - p);
            if (difA !== difB) return difA - difB;
            return sorteio[a] - sorteio[b];
        });
    }

    // BYE: menor pontuação e menor rating entre quem ainda não recebeu BYE
    const ordemPrincipal = [...jogadores].sort((a, b) => b.pontos - a.pontos || b.rating - a.rating).map(j => j.id);
    let opcoesBye = [null];
    if (ids.length % 2 !== 0) {
        const semBye = [...jogadores].filter(j => !byesInicial.has(j.id));
        opcoesBye = (semBye.length ? semBye : [...jogadores])
            .sort((a, b) => a.pontos - b.pontos || a.rating - b.rating)
            .map(j => j.id);
    }

    // Entre todos os emparceiramentos válidos, escolhe o de menor soma das diferenças de
    // pontos entre adversários (pontuações mais próximas). Os candidatos são percorridos na
    // ordem de prioridade, então em caso de empate fica o que a ordem do suíço prefere.
    // Caminhos parciais que já somam mais que o melhor encontrado são descartados (poda).
    const custoPares = pares => pares.reduce((soma, [a, b]) => soma + Math.abs(porId[a].pontos - porId[b].pontos), 0);

    function buscar(verificarAdiante) {
        for (const bye of opcoesBye) {
            const livres = ordemPrincipal.filter(id => id !== bye);
            const novosByes = bye === null ? byesInicial : new Set([...byesInicial, bye]);
            let melhor = null;
            let melhorCusto = Infinity;
            try {
                enumerar(livres, jogadosInicial, ordenarPorPrioridade, pares => {
                    const custo = custoPares(pares);
                    if (custo >= melhorCusto) return false;
                    if (verificarAdiante && !viavel(rodadasRestantes, comNovosPares(jogadosInicial, pares), novosByes)) return false;
                    melhor = pares.map(([a, b]) => [porId[a], porId[b]]);
                    melhorCusto = custo;
                    return custo === 0; // não dá para melhorar
                }, [], pares => custoPares(pares) >= melhorCusto);
            } catch (e) {
                // Busca longa demais: fica com o melhor encontrado até aqui, se houver
                if (e !== ESTOUROU || !melhor) throw e;
            }
            if (melhor) return { pares: melhor, bye: bye === null ? null : porId[bye] };
        }
        return null;
    }

    try {
        const resultado = buscar(true);
        if (resultado) return resultado;
        console.warn('Nenhum emparceiramento mantém o torneio completo; usando o melhor possível para esta rodada.');
    } catch (e) {
        if (e !== ESTOUROU) throw e;
        console.warn('Busca adiante muito longa; usando emparceiramento sem verificação das próximas rodadas.');
    }
    passos = 0;
    try {
        return buscar(false) || { pares: null, bye: null };
    } catch (e) {
        if (e !== ESTOUROU) throw e;
        return { pares: null, bye: null };
    }
}

// Nova função para balancear cores após o emparceiramento
function balancearCores(emparceiramentos, jogadorTop) {
    // Criar uma cópia dos emparceiramentos para não modificar o original
    const emparceiramentosBalanceados = [...emparceiramentos];
    
    // Calcular o desequilíbrio de cores para cada jogador
    const desequilibrioPorJogador = {};
    
    // Primeiro, coletamos todos os jogadores e seus históricos
    const todosJogadores = new Set();
    emparceiramentosBalanceados.forEach(([j1, j2]) => {
        todosJogadores.add(j1);
        todosJogadores.add(j2);
    });
    
    // Calcular o desequilíbrio atual para cada jogador
    todosJogadores.forEach(jogador => {
        if (jogador.id === 'bye') return;
        
        const totalPartidas = jogador.historiaCores.length;
        const totalBrancas = jogador.historiaCores.filter(cor => cor === true).length;
        const totalPretas = totalPartidas - totalBrancas;
        
        // Desequilíbrio positivo = mais brancas que pretas
        // Desequilíbrio negativo = mais pretas que brancas
        desequilibrioPorJogador[jogador.id] = totalBrancas - totalPretas;
    });
    
    // Processar cada emparceiramento para decidir se inverte as cores
    for (let i = 0; i < emparceiramentosBalanceados.length; i++) {
        const [jogador1, jogador2] = emparceiramentosBalanceados[i];
        
        // Pular se algum jogador é BYE
        if (jogador1.id === 'bye' || jogador2.id === 'bye') continue;
        
        // Pular a mesa 1 se o jogador top estiver nela (preservar alternância do top)
        if (i === 0 && (jogador1.id === jogadorTop.id || jogador2.id === jogadorTop.id)) {
            continue;
        }
        
        // Calcular o desequilíbrio atual
        const desequilibrioJ1 = desequilibrioPorJogador[jogador1.id] || 0;
        const desequilibrioJ2 = desequilibrioPorJogador[jogador2.id] || 0;
        
        // Penalidade de cor: forte para a 3ª partida seguida com a mesma cor, leve para
        // repetir a cor da última partida (preferência por alternar)
        const penalidadeSequencia = (jogador, deBrancas) => {
            const h = jogador.historiaCores || [];
            const ultima = h[h.length - 1], penultima = h[h.length - 2];
            if (h.length >= 2 && ultima === deBrancas && penultima === deBrancas) return 10;
            if (h.length >= 1 && ultima === deBrancas) return 0.5;
            return 0;
        };

        // Calcular o desequilíbrio se mantiver a ordem atual (j1 brancas, j2 pretas)
        const desequilibrioAtual = Math.abs(desequilibrioJ1 + 1) + Math.abs(desequilibrioJ2 - 1)
            + penalidadeSequencia(jogador1, true) + penalidadeSequencia(jogador2, false);

        // Calcular o desequilíbrio se inverter a ordem (j1 pretas, j2 brancas)
        const desequilibrioInvertido = Math.abs(desequilibrioJ1 - 1) + Math.abs(desequilibrioJ2 + 1)
            + penalidadeSequencia(jogador1, false) + penalidadeSequencia(jogador2, true);
        
        // Inverter se o desequilíbrio for menor
        if (desequilibrioInvertido < desequilibrioAtual) {
            emparceiramentosBalanceados[i] = [jogador2, jogador1];
            
            // Atualizar os desequilíbrios para as próximas iterações
            desequilibrioPorJogador[jogador1.id] = desequilibrioJ1 - 1;
            desequilibrioPorJogador[jogador2.id] = desequilibrioJ2 + 1;
        } else {
            // Atualizar os desequilíbrios para as próximas iterações
            desequilibrioPorJogador[jogador1.id] = desequilibrioJ1 + 1;
            desequilibrioPorJogador[jogador2.id] = desequilibrioJ2 - 1;
        }
    }
    
    return emparceiramentosBalanceados;
}

async function encerrarTorneioSuico(jogadoresAtuais) {
    // Trabalha numa cópia: se a gravação falhar, dá para tentar de novo sem contar pontos em dobro
    const jogadores = jogadoresAtuais.map(j => ({ ...j }));

    // Primeiro, processar os resultados da última rodada
    const selects = document.querySelectorAll('.rodada:last-child .resultado-select');
    
    selects.forEach(select => {
        const brancasId = select.dataset.brancasId;
        const pretasId = select.dataset.pretasId;
        const resultado = select.value;

        // Processar resultado se envolver BYE
        if (brancasId === 'bye') {
            const jogador = jogadores.find(j => j.id === pretasId);
            if (jogador) {
                jogador.pontos = (jogador.pontos || 0) + 1;
            }
        } else if (pretasId === 'bye') {
            const jogador = jogadores.find(j => j.id === brancasId);
            if (jogador) {
                jogador.pontos = (jogador.pontos || 0) + 1;
            }
        } else {
            // Processar resultado normal
            const jogadorBrancas = jogadores.find(j => j.id === brancasId);
            const jogadorPretas = jogadores.find(j => j.id === pretasId);

            if (jogadorBrancas && jogadorPretas) {
                jogadorBrancas.pontos = jogadorBrancas.pontos || 0;
                jogadorPretas.pontos = jogadorPretas.pontos || 0;

                switch (resultado) {
                    case '1-0':
                        jogadorBrancas.pontos += 1;
                        break;
                    case '0-1':
                        jogadorPretas.pontos += 1;
                        break;
                    case '1/2-1/2':
                        jogadorBrancas.pontos += 0.5;
                        jogadorPretas.pontos += 0.5;
                        break;
                }
            }
        }
    });

    // Calcular resultados finais
    const resultados = jogadores.map(jogador => ({
        id: jogador.id,
        nome: jogador.nome,
        pontos: jogador.pontos || 0,
        vitorias: 0,
        empates: 0,
        sonnenbornBerger: 0,
        variacaoRating: 0,
        rating: jogador.rating
    }));

    // Calcular critérios de desempate
    const rodasContainer = document.querySelectorAll('.rodada');
    rodasContainer.forEach(rodada => {
        const selects = rodada.querySelectorAll('.resultado-select');
        
        selects.forEach(select => {
            const brancasId = select.dataset.brancasId;
            const pretasId = select.dataset.pretasId;
            const resultado = select.value;
            
            const resultadoBrancas = resultados.find(r => r.id === brancasId);
            const resultadoPretas = resultados.find(r => r.id === pretasId);
            
            if (!resultadoBrancas || !resultadoPretas) return;

            // Calcular vitórias e empates
            if (resultado === '1-0') {
                resultadoBrancas.vitorias++;
                resultadoBrancas.sonnenbornBerger += resultadoPretas.pontos;
            } else if (resultado === '0-1') {
                resultadoPretas.vitorias++;
                resultadoPretas.sonnenbornBerger += resultadoBrancas.pontos;
            } else if (resultado === '1/2-1/2') {
                resultadoBrancas.empates++;
                resultadoPretas.empates++;
                resultadoBrancas.sonnenbornBerger += resultadoPretas.pontos / 2;
                resultadoPretas.sonnenbornBerger += resultadoBrancas.pontos / 2;
            }

            // Calcular variação de rating
            if (brancasId !== 'bye' && pretasId !== 'bye') {
                const K = 20; // Fator K
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
    rodasContainer.forEach((rodada, indiceRodada) => {
        const partidas = [];
        const selects = rodada.querySelectorAll('.resultado-select');
        
        selects.forEach(select => {
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

function processarResultadosEAvancar(rodadaAtual) {
    const selects = document.querySelectorAll('.rodada:last-child .resultado-select');
    
    // Verificar consistência do histórico antes de processar
    console.log('\n=== Verificação de Consistência (Antes do Processamento) ===');
    jogadoresGlobais.forEach(jogador => {
        if (jogador.nome !== 'BYE') {
            const totalPartidas = jogador.historiaCores.length;
            const totalBrancas = jogador.historiaCores.filter(cor => cor === true).length;
            const totalPretas = jogador.historiaCores.filter(cor => cor === false).length;
            
            if (totalBrancas + totalPretas !== totalPartidas) {
                console.error(`Inconsistência encontrada para ${jogador.nome}:`);
                console.error(`Total de partidas: ${totalPartidas}`);
                console.error(`Total de brancas: ${totalBrancas}`);
                console.error(`Total de pretas: ${totalPretas}`);
                console.error(`Histórico: [${jogador.historiaCores.map(cor => cor ? 'B' : 'P').join(', ')}]`);
            }
        }
    });
    
    // Processar resultados da rodada atual
    selects.forEach(select => {
        const brancasId = select.dataset.brancasId;
        const pretasId = select.dataset.pretasId;
        const resultado = select.value;

        // Processar resultado se envolver BYE
        if (brancasId === 'bye') {
            const jogador = jogadoresGlobais.find(j => j.id === pretasId);
            if (jogador) {
                jogador.pontos = (jogador.pontos || 0) + 1;
                if (!jogador.adversariosEnfrentados) jogador.adversariosEnfrentados = [];
                if (!jogador.historiaCores) jogador.historiaCores = [];
                // Só atualiza se ainda não foi registrado
                if (jogador.historiaCores.length < rodadaAtual) {
                    jogador.adversariosEnfrentados.push('bye');
                    jogador.historiaCores.push(false); // Jogador de pretas contra BYE
                }
            }
        } else if (pretasId === 'bye') {
            const jogador = jogadoresGlobais.find(j => j.id === brancasId);
            if (jogador) {
                jogador.pontos = (jogador.pontos || 0) + 1;
                if (!jogador.adversariosEnfrentados) jogador.adversariosEnfrentados = [];
                if (!jogador.historiaCores) jogador.historiaCores = [];
                // Só atualiza se ainda não foi registrado
                if (jogador.historiaCores.length < rodadaAtual) {
                    jogador.adversariosEnfrentados.push('bye');
                    jogador.historiaCores.push(true); // Jogador de brancas contra BYE
                }
            }
        } else {
            // Processar resultado normal
            const jogadorBrancas = jogadoresGlobais.find(j => j.id === brancasId);
            const jogadorPretas = jogadoresGlobais.find(j => j.id === pretasId);

            if (jogadorBrancas && jogadorPretas) {
                // Atualizar pontos
                jogadorBrancas.pontos = jogadorBrancas.pontos || 0;
                jogadorPretas.pontos = jogadorPretas.pontos || 0;

                switch (resultado) {
                    case '1-0':
                        jogadorBrancas.pontos += 1;
                        break;
                    case '0-1':
                        jogadorPretas.pontos += 1;
                        break;
                    case '1/2-1/2':
                        jogadorBrancas.pontos += 0.5;
                        jogadorPretas.pontos += 0.5;
                        break;
                }

                // Inicializar arrays se necessário
                if (!jogadorBrancas.historiaCores) jogadorBrancas.historiaCores = [];
                if (!jogadorPretas.historiaCores) jogadorPretas.historiaCores = [];
                if (!jogadorBrancas.adversariosEnfrentados) jogadorBrancas.adversariosEnfrentados = [];
                if (!jogadorPretas.adversariosEnfrentados) jogadorPretas.adversariosEnfrentados = [];

                // Atualizar histórico apenas se ainda não foi registrado para esta rodada
                if (jogadorBrancas.historiaCores.length < rodadaAtual) {
                    console.log(`Atualizando histórico da rodada ${rodadaAtual}:`);
                    console.log(`${jogadorBrancas.nome} (Brancas) vs ${jogadorPretas.nome} (Pretas)`);
                    
                    jogadorBrancas.historiaCores.push(true);
                    jogadorPretas.historiaCores.push(false);
                    jogadorBrancas.adversariosEnfrentados.push(pretasId);
                    jogadorPretas.adversariosEnfrentados.push(brancasId);
                }
            }
        }
    });

    // Verificar consistência após processamento
    console.log('\n=== Verificação de Consistência (Após Processamento) ===');
    
    // Encontrar o jogador top
    const jogadorTop = jogadoresGlobais
        .filter(j => j.id !== 'bye')
        .sort((a, b) => {
            if (a.pontos !== b.pontos) return b.pontos - a.pontos;
            return b.rating - a.rating;
        })[0];
    
    console.log(`Jogador top: ${jogadorTop.nome}`);
    
    // CORREÇÃO ESPECIAL: Forçar alternância de cores para o jogador top em todas as rodadas
    if (jogadorTop.historiaCores.length > 0) {
        // Garantir que o histórico está correto antes de processar
        console.log('\n=== VERIFICAÇÃO DO HISTÓRICO DO JOGADOR TOP ===');
        console.log(`Nome: ${jogadorTop.nome}`);
        console.log(`Histórico atual: [${jogadorTop.historiaCores.map(cor => cor ? 'B' : 'P').join(', ')}]`);
        
        // Verificar o histórico real baseado nos emparceiramentos anteriores
        const historicoReal = [];
        document.querySelectorAll('.rodada').forEach((rodada, indice) => {
            const selects = rodada.querySelectorAll('.resultado-select');
            selects.forEach(select => {
                const brancasId = select.dataset.brancasId;
                const pretasId = select.dataset.pretasId;
                
                if (brancasId === jogadorTop.id) {
                    historicoReal.push(true); // Jogou de brancas
                } else if (pretasId === jogadorTop.id) {
                    historicoReal.push(false); // Jogou de pretas
                }
            });
        });
        
        console.log(`Histórico real: [${historicoReal.map(cor => cor ? 'B' : 'P').join(', ')}]`);
        
        // Atualizar o histórico se necessário
        if (historicoReal.length > 0 && 
            (jogadorTop.historiaCores.length !== historicoReal.length || 
             !jogadorTop.historiaCores.every((cor, i) => cor === historicoReal[i]))) {
            console.log('Corrigindo histórico do jogador top...');
            jogadorTop.historiaCores = [...historicoReal];
            console.log(`Novo histórico: [${jogadorTop.historiaCores.map(cor => cor ? 'B' : 'P').join(', ')}]`);
        }
        
        // Agora sim, definir a próxima cor baseada no histórico corrigido
        const ultimaCor = jogadorTop.historiaCores[jogadorTop.historiaCores.length - 1];
        jogadorTop.forcaPretas = ultimaCor; // Se jogou de brancas (true), força pretas (true)
        
        console.log(`Última cor jogada: ${ultimaCor === null ? 'Primeira rodada' : (ultimaCor ? 'Brancas' : 'Pretas')}`);
        console.log(`Próxima cor definida: ${jogadorTop.forcaPretas ? 'pretas' : 'brancas'}`);
        console.log('=====================================\n');
    }
    
    jogadoresGlobais.forEach(jogador => {
        if (jogador.nome !== 'BYE') {
            const totalPartidas = jogador.historiaCores.length;
            const totalBrancas = jogador.historiaCores.filter(cor => cor === true).length;
            const totalPretas = jogador.historiaCores.filter(cor => cor === false).length;
            
            console.log(`${jogador.nome}:`);
            console.log(`- Total de partidas: ${totalPartidas}`);
            console.log(`- Brancas: ${totalBrancas}`);
            console.log(`- Pretas: ${totalPretas}`);
            console.log(`- Histórico: [${jogador.historiaCores.map(cor => cor ? 'B' : 'P').join(', ')}]`);
            console.log(`- Adversários: [${jogador.adversariosEnfrentados.join(', ')}]`);
            
            if (totalBrancas + totalPretas !== totalPartidas) {
                console.error(`ERRO: Inconsistência encontrada para ${jogador.nome}!`);
            }
            
            // Verificação especial para o jogador top
            if (jogador.id === jogadorTop.id) {
                // Verificar se o jogador top tem cores alternadas
                let coresAlternadas = true;
                for (let i = 1; i < jogador.historiaCores.length; i++) {
                    if (jogador.historiaCores[i] === jogador.historiaCores[i-1]) {
                        coresAlternadas = false;
                        console.error(`ERRO: Jogador top ${jogador.nome} não tem cores alternadas!`);
                        console.error(`Rodada ${i}: ${jogador.historiaCores[i-1] ? 'brancas' : 'pretas'}`);
                        console.error(`Rodada ${i+1}: ${jogador.historiaCores[i] ? 'brancas' : 'pretas'}`);
                        break;
                    }
                }
                if (coresAlternadas) {
                    console.log(`OK: Jogador top ${jogador.nome} tem cores alternadas corretamente.`);
                }
            }
        }
    });
    console.log('=====================================\n');

    // Iniciar próxima rodada
    emparceirarSuico(jogadoresGlobais, rodadaAtual + 1);
}

// Função para criar interface da rodada (usada por ambos os sistemas)
function criarInterfaceRodada(emparceiramentos, rodadaAtual) {
    const rodadasContainer = document.getElementById('rodadas-container');
    const rodadaDiv = document.createElement('div');
    rodadaDiv.className = 'rodada';
    paresPorRodada[rodadaAtual - 1] = emparceiramentos.map(par => par.map(j => ({ id: j.id, nome: j.nome, pontos: j.pontos || 0 })));
    
    const headerDiv = document.createElement('div');
    headerDiv.style.display = 'flex';
    headerDiv.style.justifyContent = 'space-between';
    headerDiv.style.alignItems = 'center';
    headerDiv.style.marginBottom = '10px';
    
    const titulo = document.createElement('h3');
    titulo.textContent = `Rodada ${rodadaAtual}`;
    
    headerDiv.appendChild(titulo);
    rodadaDiv.appendChild(headerDiv);

    const table = document.createElement('table');
    table.className = 'table align-middle';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Mesa</th>
                <th><i class="bi bi-circle me-1"></i>Brancas</th>
                <th><i class="bi bi-circle-fill me-1"></i>Pretas</th>
                <th>Resultado</th>
            </tr>
        </thead>
        <tbody>
            ${emparceiramentos.map((par, index) => {
                const temBYE = par[0].nome === 'BYE' || par[1].nome === 'BYE';
                const resultadoBYE = temBYE ? (par[0].nome === 'BYE' ? '0-1' : '1-0') : '';
                
                const formatarJogador = (jogador) => {
                    if (jogador.nome === 'BYE') {
                        return '<span class="text-body-secondary">BYE</span>';
                    }
                    return `<span class="fw-semibold">${UI.escapar(jogador.nome)}</span> <span class="badge rounded-pill text-bg-light border num" title="Pontos">${jogador.pontos || 0}</span>`;
                };
                
                return `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${formatarJogador(par[0])}</td>
                        <td>${formatarJogador(par[1])}</td>
                        <td>
                            <select class="resultado-select" 
                                    data-mesa="${index + 1}"
                                    data-brancas-id="${UI.escapar(par[0].id)}" 
                                    data-pretas-id="${UI.escapar(par[1].id)}"
                                    ${temBYE ? 'disabled' : ''}>
                                <option value="" ${(!temBYE && !resultadoBYE) ? 'selected' : ''}>Selecione</option>
                                <option value="1-0" ${resultadoBYE === '1-0' ? 'selected' : ''}>1-0</option>
                                <option value="1/2-1/2" ${resultadoBYE === '1/2-1/2' ? 'selected' : ''}>1/2-1/2</option>
                                <option value="0-1" ${resultadoBYE === '0-1' ? 'selected' : ''}>0-1</option>
                            </select>
                        </td>
                    </tr>
                `;
            }).join('')}
        </tbody>
    `;

    rodadaDiv.appendChild(table);

    const botoesDiv = document.createElement('div');
    botoesDiv.style.marginTop = '10px';
    botoesDiv.style.display = 'flex';
    botoesDiv.style.gap = '10px';
    botoesDiv.style.justifyContent = 'flex-end';

    if (rodadaAtual === parseInt(torneioData.etapas)) {
        const encerrarTorneioBtn = document.createElement('button');
        encerrarTorneioBtn.innerHTML = '<i class="bi bi-flag-fill me-1"></i>Encerrar torneio';
        encerrarTorneioBtn.className = 'btn btn-gold botao-torneio';
        encerrarTorneioBtn.onclick = async () => {
            const todosResultadosPreenchidos = [...document.querySelectorAll('.rodada:last-child .resultado-select')]
                .every(select => select.value !== '');

            if (todosResultadosPreenchidos) {
                const ok = await UI.confirmar('Encerrar o torneio agora?\nA classificação final será gravada e os ratings dos jogadores serão atualizados.', { titulo: 'Encerrar torneio', botao: 'Encerrar e gravar' });
                if (!ok) return;
                encerrarTorneioBtn.disabled = true;
                const gravou = await encerrarTorneioSuico(jogadoresGlobais);
                // Se a gravação falhou, permite tentar de novo
                if (!gravou) encerrarTorneioBtn.disabled = false;
            } else {
                alert('Por favor, preencha todos os resultados antes de encerrar o torneio.');
            }
        };
        botoesDiv.appendChild(encerrarTorneioBtn);
    } else {
        const proximaRodadaBtn = document.createElement('button');
        proximaRodadaBtn.innerHTML = 'Próxima rodada<i class="bi bi-arrow-right ms-1"></i>';
        proximaRodadaBtn.className = 'btn btn-primary botao-torneio';
        proximaRodadaBtn.onclick = () => {
            const todosResultadosPreenchidos = [...document.querySelectorAll('.rodada:last-child .resultado-select')]
                .every(select => select.value !== '');
            
            if (todosResultadosPreenchidos) {
                processarResultadosEAvancar(rodadaAtual);
            } else {
                alert('Por favor, preencha todos os resultados antes de avançar para a próxima rodada.');
            }
        };
        botoesDiv.appendChild(proximaRodadaBtn);
    }

    rodadaDiv.appendChild(botoesDiv);
    rodadasContainer.appendChild(rodadaDiv);
    ProgressoTorneio.salvar();
    
    // Exibir estatísticas de cores apenas no console
    logEstatisticasCores(rodadaAtual);
}

// Função para exibir estatísticas de cores apenas no console
function logEstatisticasCores(rodadaAtual) {
    // Ordenar jogadores por nome para facilitar a leitura
    const jogadoresOrdenados = [...jogadoresGlobais]
        .filter(j => j.id !== 'bye')
        .sort((a, b) => a.nome.localeCompare(b.nome));
    
    console.log(`\n=== ESTATÍSTICAS DE CORES - APÓS RODADA ${rodadaAtual} ===`);
    console.log('Jogador                 | Brancas | Pretas | Diferença | Histórico');
    console.log('------------------------|---------|--------|-----------|----------');
    
    jogadoresOrdenados.forEach(jogador => {
        const historiaCores = jogador.historiaCores || [];
        const totalBrancas = historiaCores.filter(cor => cor === true).length;
        const totalPretas = historiaCores.filter(cor => cor === false).length;
        const diferenca = totalBrancas - totalPretas;
        const historico = historiaCores.map(cor => cor ? 'B' : 'P').join(',');
        
        // Formatar nome para alinhar a tabela
        const nomeFormatado = (jogador.nome + '                    ').substring(0, 22);
        
        // Formatar diferença com sinal
        const diferencaFormatada = diferenca > 0 ? `+${diferenca}` : `${diferenca}`;
        
        console.log(`${nomeFormatado} | ${totalBrancas.toString().padStart(7)} | ${totalPretas.toString().padStart(6)} | ${diferencaFormatada.padStart(9)} | ${historico}`);
    });
    
    console.log('\nLegenda: B = Brancas, P = Pretas');
    console.log('=============================================');
}