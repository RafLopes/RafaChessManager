let jogadoresGlobais = [];
let torneioData = null;

document.addEventListener('DOMContentLoaded', async function() {
    const db = firebase.firestore();
    const torneioSelect = document.getElementById('torneio-select');
    let quantidadeEtapas = 0;

    // Função para gerar um ID único
    function generateUniqueId() {
        return 'id-' + Math.random().toString(36).substr(2, 9);
    }

    // Carregar a lista de torneios
    try {
        const snapshot = await db.collection('torneio').get();
        snapshot.forEach(doc => {
            const torneioData = doc.data();
            if (!torneioData.Resultado) { // Filtrar torneios que não possuem a variável Resultado preenchida
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = torneioData.nome;
                torneioSelect.appendChild(option);
            }
        });
        // Só pode haver um torneio em aberto: já deixa selecionado
        if (torneioSelect.options.length === 2) torneioSelect.selectedIndex = 1;
    } catch (error) {
        console.error('Error getting documents: ', error);
    }

    // Carregar os dados do torneio selecionado
    document.getElementById('carregar-torneio').addEventListener('click', async function() {
        const torneioId = torneioSelect.value;
        if (torneioId === '') {
            alert('Por favor, selecione um torneio.');
            return;
        }
        try {
            const doc = await db.collection('torneio').doc(torneioId).get();
            if (doc.exists) {
                torneioData = doc.data(); // Atribuir os dados do torneio à variável global
                console.log('Torneio Data:', torneioData);
                // Salvar a quantidade de etapas
                quantidadeEtapas = torneioData.quantidadeEtapas;
                // Preencher os campos com os dados do torneio
                document.getElementById('nome-torneio').textContent = torneioData.nome;
                document.getElementById('formato-torneio').textContent = torneioData.Formato === 'schuring' ? 'Schuring' : 'Suíço';
                document.getElementById('copa-torneio').textContent = torneioData.copa ? 'Sim' : 'Não';
                document.getElementById('etapas-torneio').textContent = torneioData.Formato === 'schuring' ? 'Todos contra todos' : torneioData.etapas;
                document.getElementById('data-torneio').textContent = UI.formatarData(torneioData.data);
                document.getElementById('qtdJogadores').textContent = torneioData.jogadores.length;
                document.getElementById('tituloPagina').textContent = torneioData.nome;
                // Evita carregar duas vezes (o que duplicaria os emparceiramentos)
                torneioSelect.disabled = true;
                this.disabled = true;
                document.getElementById('cardSelecao').classList.add('d-none');
                document.getElementById('painelTorneio').classList.remove('d-none');
                // Preencher a lista de jogadores
                const jogadoresTbody = document.getElementById('jogadores-tbody');
                jogadoresTbody.innerHTML = '';
                torneioData.jogadores.forEach(jogador => {
                    // Garantir que cada jogador tenha um ID único
                    if (!jogador.id) {
                        jogador.id = generateUniqueId();
                    }
                    const tr = document.createElement('tr');
                    const tdNome = document.createElement('td');
                    const tdRating = document.createElement('td');
                    tdNome.textContent = jogador.nome;
                    tdRating.textContent = jogador.rating;
                    tdRating.className = 'text-end num';
                    tr.appendChild(tdNome);
                    tr.appendChild(tdRating);
                    jogadoresTbody.appendChild(tr);
                });
                // Exibir o botão "Emparceirar Etapa1"
                const emparceirarButton = document.getElementById('emparceirar-etapa1');
                emparceirarButton.style.display = 'block';
                // Adicionar evento de clique ao botão "Emparceirar Etapa1"
                emparceirarButton.addEventListener('click', function() {
                    // Evita gerar a primeira rodada duas vezes
                    emparceirarButton.style.display = 'none';
                    if (torneioData.Formato === 'schuring') {
                        emparceirarSchuring(torneioData.jogadores);
                    } else {
                        emparceirarSuico(torneioData.jogadores);
                    }
                });
                await oferecerRetomada(torneioId, emparceirarButton);
            } else {
                console.log('No such document!');
            }
        } catch (error) {
            console.error('Error getting document: ', error);
        }
    });

    // Se houver progresso salvo neste aparelho, oferece continuar de onde parou
    async function oferecerRetomada(torneioId, emparceirarButton) {
        const salvo = ProgressoTorneio.carregar(torneioId);
        if (!salvo) return;
        if (!ProgressoTorneio.compativel(salvo, torneioData)) {
            alert('Havia um progresso salvo neste aparelho, mas os jogadores ou o formato do torneio mudaram. Ele não será usado.');
            return;
        }
        const qtd = salvo.rodadas.length;
        const resumo = salvo.formato === 'suico' ? `${qtd} rodada${qtd > 1 ? 's' : ''} gerada${qtd > 1 ? 's' : ''}` : 'rodadas geradas';
        const continuar = await UI.confirmar(
            `Este torneio já estava em andamento neste aparelho (${resumo}, última alteração em ${ProgressoTorneio.descreverHorario(salvo.salvoEm)}).

Deseja continuar de onde parou?`,
            { titulo: 'Continuar torneio', botao: 'Continuar torneio', cancelar: 'Começar do zero' });
        if (!continuar) {
            const apagar = await UI.confirmar(
                'Começar do zero apaga as rodadas e os resultados salvos neste aparelho. Isso não pode ser desfeito.',
                { titulo: 'Começar do zero?', botao: 'Apagar e começar do zero', cancelar: 'Voltar e continuar', perigo: true });
            if (apagar) {
                ProgressoTorneio.limpar(torneioId);
                return;
            }
        }
        emparceirarButton.style.display = 'none';
        if (ProgressoTorneio.restaurar(salvo)) {
            alert('Torneio retomado de onde parou.');
        } else {
            document.getElementById('rodadas-container').innerHTML = '';
            jogadoresGlobais = [];
            paresPorRodada = [];
            emparceirarButton.style.display = 'block';
            document.getElementById('cardEmparceirar').classList.remove('d-none');
            alert('Não foi possível retomar o torneio automaticamente. O progresso salvo foi mantido neste aparelho; use as anotações em papel ou o Torneio Manual.');
        }
    }

    class Player {
        constructor(id, nome, rating) {
            this.id = id;
            this.nome = nome;
            this.rating = rating;
            this.pontos = 0;
            this.adversariosEnfrentados = []; // Lista de IDs dos adversários já enfrentados
            this.historiaCores = []; // true = Brancas, false = Pretas
        }
    }


    // Atualizar o CSS
    const style = document.createElement('style');
    style.textContent = `
        .btn-random {
            padding: 5px 10px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-left: 10px;
        }
        
        .btn-random:hover {
            background-color: #45a049;
        }
        
        .rodada {
            margin-bottom: 20px;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
    `;
    document.head.appendChild(style);
});