// Página da Copa: busca as etapas no banco e desenha. A regra de pontuação está em copa.js.
async function atualizarResultadosCopa() {
    try {
        // Buscar todos os torneios com flag copa = true
        const torneiosSnapshot = await firebase.firestore()
            .collection('torneio')
            .where('copa', '==', true)
            .get();

        const torneios = torneiosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const { torneiosDoAno, classificacao } = Copa.calcular(torneios, new Date().getFullYear());

        exibirClassificacao(classificacao);
        exibirTorneios(torneiosDoAno);

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
