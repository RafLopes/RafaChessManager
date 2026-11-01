async function ListDBJSON() {
    var db = firebase.firestore();
    var players = [];

    try {
        const querySnapshot = await db.collection('players').get();
        querySnapshot.forEach((doc) => {
            let playerData = doc.data();
            playerData.id = doc.id;
            players.push(playerData);
        });

        // Ordenar os jogadores por rating (maior para menor) - padrão
        players.sort((a, b) => {
            return b.Rating - a.Rating;
        });

        // Armazenar na variável global para uso posterior
        allPlayers = players;

        const contagem = document.getElementById('contagem');
        if (contagem) contagem.textContent = players.length;

        populateTable(players);
    } catch (error) {
        console.error('Error getting documents: ', error);
        UI.toast('Erro ao carregar a lista de jogadores.', 'danger');
    }
}

const ROTULO_SEXO = { male: 'Masculino', female: 'Feminino', M: 'Masculino', F: 'Feminino' };

function populateTable(players) {
    const tableBody = document.querySelector('#playersTable tbody');
    tableBody.innerHTML = ''; // Limpar o conteúdo existente
    const e = UI.escapar;

    if (players.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="empty-state"><i class="bi bi-search"></i>Nenhum jogador encontrado.</td></tr>';
        return;
    }

    players.forEach((player) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="text-body-secondary num">${e(player.id)}</td>
            <td data-csv="${e(player.Nome)}"><a href="HistoricoJogador.html?id=${encodeURIComponent(player.id)}" class="fw-semibold text-decoration-none">${e(player.Nome)}</a></td>
            <td class="num d-none d-sm-table-cell">${e(player.Idade)}</td>
            <td class="num fw-semibold">${e(player.Rating)}</td>
            <td class="d-none d-sm-table-cell" data-csv="${e(player.sexo)}">${e(ROTULO_SEXO[player.sexo] || player.sexo)}</td>
        `;
        tableBody.appendChild(row);
    });
}