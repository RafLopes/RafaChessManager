// Inicializar variáveis globais
let torneiosDaCopa = [];
let classificacaoGeral = new Map(); // Map para armazenar pontos por jogador

// Função principal para atualizar os resultados
async function atualizarResultadosCopa() {
    console.log('Iniciando atualização dos resultados da copa...');
    try {
        // Limpar dados anteriores
        torneiosDaCopa = [];
        classificacaoGeral.clear();

        // Pegar o ano atual
        const anoAtual = new Date().getFullYear();
        console.log(`Filtrando torneios de ${anoAtual}`);

        // Buscar todos os torneios com flag copa = true
        const torneiosSnapshot = await firebase.firestore()
            .collection('torneio')
            .where('copa', '==', true)
            .get();

        console.log(`Encontrados ${torneiosSnapshot.docs.length} torneios da copa`);

        // Processar cada torneio
        for (const doc of torneiosSnapshot.docs) {
            const torneio = {
                id: doc.id,
                ...doc.data()
            };
            
            // Extrair o ano da data (formato yyyy-mm-dd)
            const anoTorneio = torneio.data ? parseInt(torneio.data.substring(0, 4)) : null;
            
            // Pular torneios que não são do ano atual
            if (anoTorneio !== anoAtual) {
                console.log(`Torneio ${torneio.nome} (${anoTorneio}) é de outro ano, pulando...`);
                continue;
            }
            
            console.log(`\nProcessando torneio ${torneio.nome} (Formato: ${torneio.Formato || 'não especificado'}):`);
            torneiosDaCopa.push(torneio);

            // Se o torneio tem resultados, processar pontuação
            if (torneio.Resultado && Array.isArray(torneio.Resultado)) {
                console.log(`Total de ${torneio.Resultado.length} jogadores no torneio ${torneio.nome}`);
                
                // Ordenar resultados baseado no formato do torneio
                let resultadosOrdenados;
                if (torneio.Formato === 'suico') {
                    // Para torneio suíço, ordenar por pontos e sonnenbornBerger
                    resultadosOrdenados = [...torneio.Resultado]
                        .sort((a, b) => {
                            if (b.pontos === a.pontos) {
                                return b.sonnenbornBerger - a.sonnenbornBerger;
                            }
                            return b.pontos - a.pontos;
                        });
                } else {
                    // Para outros formatos (schuring), ordenar por pontos
                    resultadosOrdenados = [...torneio.Resultado]
                        .sort((a, b) => b.pontos - a.pontos);
                }

                console.log('Ordem final do torneio:');
                resultadosOrdenados.forEach((j, i) => {
                    const nomeJogador = j.jogador ? j.jogador.nome : j.nome;
                    console.log(`${i+1}º lugar: ${nomeJogador} (${j.pontos} pontos)`);
                });

                // Processar cada posição do resultado ordenado
                resultadosOrdenados.forEach((jogador, posicao) => {
                    // Pegar o nome do jogador baseado no formato
                    const nomeJogador = jogador.jogador ? jogador.jogador.nome : jogador.nome;

                    // Ignorar jogador BYE ou undefined
                    if (!nomeJogador || nomeJogador === 'BYE' || nomeJogador === 'undefined') return;

                    // Calcular pontos baseado na posição
                    let pontosCopa = 0;
                    switch (posicao) {
                        case 0: pontosCopa = 6; break;  // 1º lugar
                        case 1: pontosCopa = 4; break;  // 2º lugar
                        case 2: pontosCopa = 3; break;  // 3º lugar
                        case 3: pontosCopa = 2; break;  // 4º lugar
                        case 4: pontosCopa = 1; break;  // 5º lugar
                        default: pontosCopa = 0;        // 6º lugar ou pior
                    }

                    // Somar os pontos do torneio
                    const pontosTorneio = jogador.pontos || 0;
                    const pontosTotais = pontosCopa + pontosTorneio;

                    // Adicionar pontos ao jogador na classificação geral
                    const pontosAtuais = classificacaoGeral.get(nomeJogador) || 0;
                    const novosPontos = pontosAtuais + pontosTotais;
                    classificacaoGeral.set(nomeJogador, novosPontos);
                    
                    console.log(`${nomeJogador}: ${pontosCopa} pontos posição + ${pontosTorneio} pontos torneio = ${pontosTotais} (${torneio.nome}), total agora: ${novosPontos}`);
                });
            } else {
                console.log(`Torneio ${torneio.nome} não tem resultados ou formato inválido`);
            }
        }

        console.log('\nPontuação final por jogador:');
        classificacaoGeral.forEach((pontos, nome) => {
            console.log(`${nome}: ${pontos} pontos totais`);
        });

        // Criar array ordenado da classificação
        const classificacaoArray = Array.from(classificacaoGeral.entries())
            .filter(([nome]) => nome && nome !== 'BYE' && nome !== 'undefined')
            .map(([nome, pontos]) => ({ nome, pontos }))
            .sort((a, b) => b.pontos - a.pontos);

        // Exibir resultados
        exibirClassificacao(classificacaoArray);
        exibirTorneios(torneiosDaCopa);

    } catch (error) {
        console.error('Erro ao atualizar resultados:', error);
        alert('Erro ao atualizar os resultados da copa: ' + error.message);
    }
}

// Função para exibir a classificação
function exibirClassificacao(classificacao) {
    const container = document.getElementById('resultadosCopa');
    if (!container) {
        console.error('Elemento resultadosCopa não encontrado');
        return;
    }
    const e = UI.escapar;
    if (classificacao.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="bi bi-hourglass"></i>Nenhuma etapa da Copa foi finalizada neste ano ainda.</div>';
        return;
    }
    const lider = classificacao[0].pontos || 1;
    container.innerHTML = `
        <div class="card-body pb-0">${UI.podio(classificacao.slice(0, 3).map(j => ({ nome: j.nome, detalhe: `${j.pontos} pts` })))}</div>
        <div class="table-wrap">
            <table class="table table-hover align-middle">
                <thead>
                    <tr>
                        <th>Pos.</th>
                        <th>Jogador</th>
                        <th class="text-end">Pontos</th>
                    </tr>
                </thead>
                <tbody>
                    ${classificacao.map((jogador, index) => `
                        <tr>
                            <td style="width:4rem">${UI.badgePosicao(index + 1)}</td>
                            <td>
                                <div class="fw-semibold">${e(jogador.nome)}</div>
                                <div class="progress mt-1" style="height:4px" role="presentation">
                                    <div class="progress-bar" style="width:${Math.max(2, (jogador.pontos / lider) * 100)}%;background:var(--xd-gold)"></div>
                                </div>
                            </td>
                            <td class="text-end fw-semibold num">${e(jogador.pontos)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Função para exibir a lista de torneios
function exibirTorneios(torneios) {
    const container = document.getElementById('torneiosLista');
    if (!container) {
        console.error('Elemento torneiosLista não encontrado');
        return;
    }
    const e = UI.escapar;

    // Ordenar torneios por data (mais recente primeiro)
    const torneiosOrdenados = [...torneios].sort((a, b) => {
        const dataA = new Date(a.data);
        const dataB = new Date(b.data);
        return dataB - dataA; // Descrescente (mais recente primeiro)
    });

    if (torneiosOrdenados.length === 0) {
        container.innerHTML = '<div class="card-body text-body-secondary small">Nenhuma etapa cadastrada neste ano.</div>';
        return;
    }

    container.innerHTML = `
        <ul class="list-group list-group-flush lista-torneios">
            ${torneiosOrdenados.map(torneio => {
                const nomeTorneio = torneio.nome || torneio.Nome || 'Nome não disponível';
                const finalizado = !!torneio.Resultado;
                const campeao = finalizado && torneio.Resultado[0] ? (torneio.Resultado[0].jogador ? torneio.Resultado[0].jogador.nome : torneio.Resultado[0].nome) : null;
                const nome = finalizado
                    ? `<a href="VisualizarTorneio.html?id=${encodeURIComponent(torneio.id)}" class="fw-semibold text-decoration-none">${e(nomeTorneio)}</a>`
                    : `<span class="fw-semibold">${e(nomeTorneio)}</span>`;
                return `
                    <li class="list-group-item">
                        <div class="d-flex justify-content-between align-items-start gap-2">
                            <div>${nome}
                                <div class="small text-body-secondary">${UI.formatarData(torneio.data)}${campeao ? ` · 🏆 ${e(campeao)}` : ''}</div>
                            </div>
                            <span class="badge ${finalizado ? 'text-bg-success' : 'text-bg-warning'}">${finalizado ? 'Finalizado' : 'Em andamento'}</span>
                        </div>
                    </li>
                `;
            }).join('')}
        </ul>
    `;
}

// Adicionar event listener ao botão de atualizar
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, inicializando...');
    const btnAtualizar = document.getElementById('atualizarButton');
    if (!btnAtualizar) {
        console.error('Botão de atualizar não encontrado');
        return;
    }
    btnAtualizar.addEventListener('click', atualizarResultadosCopa);
    console.log('Event listener adicionado ao botão');

    // Carregar resultados iniciais
    atualizarResultadosCopa();
});
