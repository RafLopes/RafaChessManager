// Inicializa o Firebase
const db = firebase.firestore();
let jogadoresDisponiveis = []; // Array para armazenar todos os jogadores

// Função para atualizar a lista de jogadores disponíveis
function atualizarListaJogadoresDisponiveis() {
    const selectJogador = document.getElementById('novo-jogador-nome');
    const jogadoresAtuais = document.getElementById('jogadores-tbody').getElementsByTagName('tr');
    const jogadoresNoTorneio = Array.from(jogadoresAtuais).map(linha => linha.dataset.jogadorId);
    
    console.log('Jogadores no torneio:', jogadoresNoTorneio); // Debug
    
    // Limpar o select
    selectJogador.innerHTML = '<option value="">Selecione um jogador...</option>';
    
    // Adicionar apenas jogadores que não estão no torneio
    jogadoresDisponiveis
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')) // Ordenar alfabeticamente por nome
        .forEach(jogador => {
            if (!jogadoresNoTorneio.includes(jogador.id)) {
                const option = document.createElement('option');
                option.value = jogador.id;
                option.textContent = jogador.nome; // Apenas o nome, sem o rating
                selectJogador.appendChild(option);
            }
        });
}

// Função para remover jogador
async function removerJogador(tr, jogador) {
    if (await UI.confirmar(`Deseja realmente remover o jogador ${jogador.nome} deste torneio?`, { titulo: 'Remover participante', botao: 'Remover', perigo: true })) {
        tr.remove();
        atualizarListaJogadoresDisponiveis(); // Atualizar lista após remover
    }
}

// Linha da tabela de participantes
function criarLinhaJogador(id, nome, rating, jogadorParaRemover) {
    const tr = document.createElement('tr');
    tr.dataset.jogadorId = id;

    const tdNome = document.createElement('td');
    const tdRating = document.createElement('td');
    const tdAcoes = document.createElement('td');

    tdNome.textContent = nome;
    tdNome.className = 'fw-semibold';
    tdRating.textContent = rating;
    tdRating.className = 'num';
    tdAcoes.className = 'text-end';

    const btnRemover = document.createElement('button');
    btnRemover.innerHTML = '<i class="bi bi-x-lg me-1"></i>Remover';
    btnRemover.className = 'btn btn-sm btn-outline-danger btn-remover';
    btnRemover.onclick = () => removerJogador(tr, jogadorParaRemover);

    tdAcoes.appendChild(btnRemover);
    tr.appendChild(tdNome);
    tr.appendChild(tdRating);
    tr.appendChild(tdAcoes);
    return tr;
}

document.addEventListener('DOMContentLoaded', async function() {
    const torneioSelect = document.getElementById('tournamentSelect');
    
    // Carregar a lista de torneios
    try {
        const torneiosSnapshot = await db.collection('torneio').get();
        torneiosSnapshot.forEach(doc => {
            const torneioData = doc.data();
            if (!torneioData.Resultado) { // Só carrega torneios que não foram finalizados
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = torneioData.nome;
                torneioSelect.appendChild(option);
            }
        });
        // Só pode haver um torneio em aberto: já deixa selecionado
        if (torneioSelect.options.length === 2) torneioSelect.selectedIndex = 1;
    } catch (error) {
        console.error('Erro ao carregar torneios:', error);
    }

    // Carregar a lista de jogadores disponíveis
    try {
        const playersSnapshot = await db.collection('players').get();
        
        playersSnapshot.forEach(doc => {
            const jogador = {
                id: doc.id,
                nome: doc.data().Nome,
                rating: doc.data().Rating
            };
            jogadoresDisponiveis.push(jogador);
        });
    } catch (error) {
        console.error('Erro ao carregar jogadores:', error);
    }

    // Adicionar evento para atualizar o rating quando um jogador é selecionado
    document.getElementById('novo-jogador-nome').addEventListener('change', function() {
        const jogadorId = this.value;
        const jogador = jogadoresDisponiveis.find(j => j.id === jogadorId);
        const ratingSpan = document.getElementById('novo-jogador-rating');
        
        if (jogador) {
            ratingSpan.textContent = jogador.rating;
        } else {
            ratingSpan.textContent = '';
        }
    });

    // Adiciona listener para o botão de carregar
    const loadButton = document.getElementById('loadTournamentButton');
    if (loadButton) {
        loadButton.addEventListener('click', async () => {
            const selectedTournamentId = torneioSelect.value;
            if (selectedTournamentId) {
                try {
                    const docRef = await db.collection('torneio').doc(selectedTournamentId).get();
                    if (docRef.exists) {
                        const torneioData = docRef.data();
                        console.log('Dados do torneio:', torneioData);
                        
                        // Exibir as seções
                        document.getElementById('torneio-info').style.display = 'block';
                        document.getElementById('jogadores-list').style.display = 'block';
                        
                        // Preencher as informações do torneio
                        document.getElementById('nome-torneio').value = torneioData.nome || '';
                        document.getElementById('formato-torneio').value = torneioData.Formato?.toLowerCase() || 'suico';
                        document.getElementById('copa-torneio').value = torneioData.copa?.toString() || 'false';
                        document.getElementById('etapas-torneio').value = torneioData.etapas || '';
                        document.getElementById('data-torneio').value = torneioData.data || '';
                        
                        // Preencher a tabela de jogadores
                        const jogadoresTbody = document.getElementById('jogadores-tbody');
                        jogadoresTbody.innerHTML = '';
                        
                        if (torneioData.jogadores) {
                            // Primeiro, vamos buscar todos os jogadores do banco para ter os IDs corretos
                            try {
                                const playersSnapshot = await db.collection('players').get();
                                const jogadoresDB = {};
                                playersSnapshot.forEach(doc => {
                                    jogadoresDB[doc.data().Nome] = {
                                        id: doc.id,
                                        nome: doc.data().Nome,
                                        rating: doc.data().Rating
                                    };
                                });

                                // Agora vamos criar as linhas com os IDs corretos
                                torneioData.jogadores.forEach(jogador => {
                                    const jogadorDB = jogadoresDB[jogador.nome];
                                    if (jogadorDB) {
                                        jogadoresTbody.appendChild(criarLinhaJogador(jogadorDB.id, jogadorDB.nome, jogadorDB.rating, jogadorDB));
                                    }
                                });
                            } catch (error) {
                                console.error('Erro ao carregar jogadores do banco:', error);
                            }
                        }
                        
                        // Atualizar a lista de jogadores disponíveis após carregar os jogadores do torneio
                        atualizarListaJogadoresDisponiveis();
                        
                        console.log('Torneio carregado com sucesso:', torneioData);
                    } else {
                        console.log('Torneio não encontrado');
                        alert('Torneio não encontrado');
                    }
                } catch (error) {
                    console.error('Erro ao carregar o torneio:', error);
                    alert('Erro ao carregar o torneio');
                }
            } else {
                alert('Por favor, selecione um torneio.');
            }
        });
    }

    // Atualizar o evento de adicionar jogador
    document.getElementById('adicionar-jogador').addEventListener('click', () => {
        const selectJogador = document.getElementById('novo-jogador-nome');
        const jogadorId = selectJogador.value;
        
        if (!jogadorId) {
            alert('Por favor, selecione um jogador.');
            return;
        }
        
        const jogador = jogadoresDisponiveis.find(j => j.id === jogadorId);
        if (!jogador) {
            alert('Jogador não encontrado.');
            return;
        }
        
        document.getElementById('jogadores-tbody').appendChild(criarLinhaJogador(jogadorId, jogador.nome, jogador.rating, jogador));

        // Limpar seleção
        selectJogador.value = '';
        document.getElementById('novo-jogador-rating').textContent = '';
        
        // Atualizar a lista de jogadores disponíveis
        atualizarListaJogadoresDisponiveis();
    });

    // Atualizar a função de salvar
    document.getElementById('salvar-alteracoes').addEventListener('click', async () => {
        const selectedTournamentId = document.getElementById('tournamentSelect').value;
        
        if (!selectedTournamentId) {
            alert('Nenhum torneio selecionado');
            return;
        }

        try {
            const jogadores = [];
            const linhas = document.getElementById('jogadores-tbody').getElementsByTagName('tr');
            for (let linha of linhas) {
                const jogadorId = linha.dataset.jogadorId;
                const colunas = linha.getElementsByTagName('td');
                jogadores.push({
                    id: jogadorId,
                    nome: colunas[0].textContent,
                    rating: Number(colunas[1].textContent)
                });
            }

            const torneioAtualizado = {
                nome: document.getElementById('nome-torneio').value,
                Formato: document.getElementById('formato-torneio').value,
                copa: document.getElementById('copa-torneio').value === 'true',
                etapas: document.getElementById('etapas-torneio').value,
                data: document.getElementById('data-torneio').value,
                jogadores: jogadores
            };

            await db.collection('torneio').doc(selectedTournamentId).update(torneioAtualizado);
            alert('Torneio atualizado com sucesso!');
            
            // Recarregar a página após o sucesso
            window.location.reload();
            
        } catch (error) {
            console.error('Erro ao atualizar torneio:', error);
            alert('Erro ao atualizar o torneio');
        }
    });

    // Adicionar evento para excluir torneio
    document.getElementById('excluir-torneio').addEventListener('click', async function() {
        const selectedTournamentId = document.getElementById('tournamentSelect').value;
        
        if (!selectedTournamentId) {
            alert('Nenhum torneio selecionado');
            return;
        }

        const nomeTorneio = document.getElementById('nome-torneio').value;
        const confirmacao = await UI.confirmar(`Tem certeza que deseja excluir o torneio "${nomeTorneio}"?\nEsta ação não pode ser desfeita.`, { titulo: 'Excluir torneio', botao: 'Excluir', perigo: true });
        
        if (confirmacao) {
            try {
                await db.collection('torneio').doc(selectedTournamentId).delete();
                alert('Torneio excluído com sucesso!');
                window.location.href = 'index.html'; // Redireciona para a página inicial
            } catch (error) {
                console.error('Erro ao excluir torneio:', error);
                alert('Erro ao excluir o torneio');
            }
        }
    });
});
