const db = firebase.firestore();
let torneiosList = [];
let torneiosSelecionados = [];

// Carregar torneios ao abrir a página
document.addEventListener('DOMContentLoaded', async function() {
    await carregarTorneios();
    
    // Adicionar eventos aos botões
    document.getElementById('selectAllBtn').addEventListener('click', selecionarTodos);
    document.getElementById('deselectAllBtn').addEventListener('click', desseleccionarTodos);
    document.getElementById('calcularBtn').addEventListener('click', calcularResultados);
});

// Função para carregar todos os torneios
async function carregarTorneios() {
    try {
        const snapshot = await db.collection('torneio').get();
        torneiosList = [];
        
        snapshot.forEach(doc => {
            torneiosList.push({
                id: doc.id,
                nome: doc.data().nome,
                data: doc.data().data,
                formato: doc.data().Formato,
                temResultado: !!doc.data().Resultado
            });
        });
        
        // Ordenar por data (mais recente primeiro)
        torneiosList.sort((a, b) => new Date(b.data) - new Date(a.data));
        
        renderizarTorneios();
    } catch (error) {
        console.error('Erro ao carregar torneios:', error);
        mostrarErro('Erro ao carregar torneios: ' + error.message);
    }
}

// Função para renderizar a lista de torneios
function renderizarTorneios() {
    const container = document.getElementById('torneiosContainer');
    container.innerHTML = '';
    
    if (torneiosList.length === 0) {
        container.innerHTML = '<p>Nenhum torneio encontrado.</p>';
        return;
    }
    
    torneiosList.forEach(torneio => {
        const div = document.createElement('div');
        div.className = 'torneio-item list-group-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'form-check-input mt-0';
        checkbox.id = 'torneio-' + torneio.id;
        checkbox.value = torneio.id;
        
        const label = document.createElement('label');
        label.htmlFor = 'torneio-' + torneio.id;
        label.appendChild(checkbox);
        
        const span = document.createElement('span');
        span.textContent = torneio.nome;
        label.appendChild(span);
        
        div.appendChild(label);
        
        const info = document.createElement('div');
        info.className = 'torneio-info';
        info.innerHTML = `
            <strong>Data:</strong> ${UI.formatarData(torneio.data)}<br>
            <strong>Formato:</strong> ${UI.escapar(torneio.formato || 'Não especificado')}<br>
            <strong>Status:</strong> ${torneio.temResultado ? 'Com resultado' : 'Sem resultado'}
        `;
        
        div.appendChild(info);
        container.appendChild(div);
        
        // Adicionar evento DEPOIS de adicionar ao DOM
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                if (!torneiosSelecionados.includes(torneio.id)) {
                    torneiosSelecionados.push(torneio.id);
                }
            } else {
                torneiosSelecionados = torneiosSelecionados.filter(id => id !== torneio.id);
            }
            console.log('Torneios selecionados:', torneiosSelecionados);
        });
    });
}

// Função para selecionar todos os torneios
function selecionarTodos() {
    torneiosSelecionados = torneiosList.map(t => t.id);
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = true;
    });
}

// Função para desselecionar todos os torneios
function desseleccionarTodos() {
    torneiosSelecionados = [];
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
}

// Função principal para calcular resultados
async function calcularResultados() {
    if (torneiosSelecionados.length === 0) {
        mostrarErro('Selecione pelo menos um torneio!');
        return;
    }
    
    try {
        document.getElementById('resultsSection').classList.add('show');
        document.getElementById('resultsBody').innerHTML = '<tr><td colspan="3" class="loading">Processando...</td></tr>';
        
        const classificacao = await processarTorneiosSelecionados();
        
        renderizarResultados(classificacao);
        
    } catch (error) {
        console.error('Erro ao calcular resultados:', error);
        mostrarErro('Erro ao calcular resultados: ' + error.message);
    }
}

// Função para processar os torneios selecionados
async function processarTorneiosSelecionados() {
    const classificacaoGeral = new Map();
    const torneiosProcessados = [];
    
    for (const torneioId of torneiosSelecionados) {
        try {
            const doc = await db.collection('torneio').doc(torneioId).get();
            
            if (!doc.exists) continue;
            
            const torneio = {
                id: doc.id,
                nome: doc.data().nome,
                ...doc.data()
            };
            
            // Verificar se tem resultados
            if (!torneio.Resultado || !Array.isArray(torneio.Resultado)) {
                continue;
            }
            
            torneiosProcessados.push(torneio.nome);
            
            // Ordenar resultados baseado no formato do torneio
            let resultadosOrdenados;
            if (torneio.Formato === 'suico') {
                resultadosOrdenados = [...torneio.Resultado]
                    .sort((a, b) => {
                        if (b.pontos === a.pontos) {
                            return b.sonnenbornBerger - a.sonnenbornBerger;
                        }
                        return b.pontos - a.pontos;
                    });
            } else {
                resultadosOrdenados = [...torneio.Resultado]
                    .sort((a, b) => b.pontos - a.pontos);
            }
            
            // Processar cada posição
            resultadosOrdenados.forEach((jogador, posicao) => {
                const nomeJogador = jogador.jogador ? jogador.jogador.nome : jogador.nome;
                
                // Ignorar BYE e undefined
                if (!nomeJogador || nomeJogador === 'BYE' || nomeJogador === 'undefined') return;
                
                // Calcular pontos (mesma lógica da copa)
                let pontosCopa = 0;
                switch (posicao) {
                    case 0: pontosCopa = 6; break;   // 1º lugar
                    case 1: pontosCopa = 4; break;   // 2º lugar
                    case 2: pontosCopa = 3; break;   // 3º lugar
                    case 3: pontosCopa = 2; break;   // 4º lugar
                    case 4: pontosCopa = 1; break;   // 5º lugar
                    default: pontosCopa = 0;         // 6º lugar ou pior
                }
                
                const pontosTorneio = jogador.pontos || 0;
                const pontosTotais = pontosCopa + pontosTorneio;
                
                // Adicionar pontos
                const pontosAtuais = classificacaoGeral.get(nomeJogador) || 0;
                classificacaoGeral.set(nomeJogador, pontosAtuais + pontosTotais);
            });
            
        } catch (error) {
            console.error('Erro ao processar torneio:', error);
        }
    }
    
    // Atualizar informações
    document.getElementById('resultsInfo').textContent = `Torneios processados: ${torneiosProcessados.join(', ')}`;
    
    // Converter para array e ordenar
    return Array.from(classificacaoGeral.entries())
        .map(([nome, pontos]) => ({ nome, pontos }))
        .sort((a, b) => b.pontos - a.pontos);
}

// Função para renderizar os resultados
function renderizarResultados(resultados) {
    const tbody = document.getElementById('resultsBody');
    tbody.innerHTML = '';
    
    if (resultados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3">Nenhum resultado disponível</td></tr>';
        return;
    }
    
    resultados.forEach((jogador, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${UI.badgePosicao(index + 1)}</td>
            <td class="fw-semibold">${UI.escapar(jogador.nome)}</td>
            <td class="text-end num fw-semibold">${jogador.pontos.toFixed(1)}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Função para mostrar erros
function mostrarErro(mensagem) {
    const errorDiv = document.getElementById('errorDiv');
    errorDiv.textContent = mensagem;
    errorDiv.style.display = 'block';
    
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}
