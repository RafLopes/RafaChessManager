// Preencher o seletor de jogadores por nome (o ID continua sendo o que vale)
document.addEventListener('DOMContentLoaded', async function () {
    const seletor = document.getElementById('seletorJogador');
    const campoId = document.getElementById('playerId');
    try {
        const snapshot = await firebase.firestore().collection('players').get();
        const jogadores = snapshot.docs.map(doc => ({ id: doc.id, nome: doc.data().Nome }))
            .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
        seletor.innerHTML = '<option value="">Selecione um jogador...</option>' +
            jogadores.map(j => `<option value="${UI.escapar(j.id)}">${UI.escapar(j.nome)} (ID ${UI.escapar(j.id)})</option>`).join('');
    } catch (error) {
        console.error('Erro ao carregar jogadores:', error);
        seletor.innerHTML = '<option value="">Erro ao carregar jogadores</option>';
    }
    seletor.addEventListener('change', () => {
        campoId.value = seletor.value;
        if (seletor.value) loadPlayer();
    });
    campoId.addEventListener('input', () => { seletor.value = ''; });
});

async function loadPlayer() {
    var playerId = document.getElementById('playerId').value;
    var db = firebase.firestore();

    if (!playerId) {
        alert('Por favor, informe um ID de jogador.');
        return;
    }

    try {
        const docRef = db.collection('players').doc(playerId);
        const doc = await docRef.get();

        if (doc.exists) {
            var playerData = doc.data();
            displayPlayerInfo(playerData, playerId);
        } else {
            alert('Jogador não encontrado.');
        }
    } catch (error) {
        console.error('Error getting document:', error);
    }
}

function displayPlayerInfo(playerData, playerId) {
    const e = UI.escapar;
    var playerInfoDiv = document.getElementById('playerInfo');
    playerInfoDiv.innerHTML = `
        <div class="border rounded-3 p-3">
            <div class="d-flex align-items-center gap-3 mb-3">
                <span class="atalho-icone d-grid rounded-3" style="width:48px;height:48px;place-items:center;background:var(--xd-gold-soft);font-size:1.4rem"><i class="bi bi-person"></i></span>
                <div>
                    <div class="fw-semibold fs-5">${e(playerData.Nome)}</div>
                    <div class="small text-body-secondary">ID ${e(playerId)}</div>
                </div>
            </div>
            <div class="row text-center g-2 mb-3">
                <div class="col"><div class="small text-body-secondary">Idade</div><div class="fw-semibold">${e(playerData.Idade)}</div></div>
                <div class="col"><div class="small text-body-secondary">Rating</div><div class="fw-semibold">${e(playerData.Rating)}</div></div>
                <div class="col"><div class="small text-body-secondary">Sexo</div><div class="fw-semibold">${e({ male: 'Masculino', female: 'Feminino' }[playerData.sexo] || playerData.sexo)}</div></div>
            </div>
            <button type="button" class="btn btn-danger w-100" id="botaoDeletar"><i class="bi bi-trash me-1"></i>Deletar jogador</button>
        </div>
    `;
    document.getElementById('botaoDeletar').addEventListener('click', async () => {
        const ok = await UI.confirmar(
            `Tem certeza que deseja deletar ${playerData.Nome} (ID ${playerId})?\nEsta ação não pode ser desfeita.`,
            { titulo: 'Deletar jogador', botao: 'Deletar', perigo: true }
        );
        if (ok) deletePlayer(playerId);
    });
}

async function deletePlayer(playerId) {
    var db = firebase.firestore();

    try {
        await db.collection('players').doc(playerId).delete();
        alert('Jogador deletado com sucesso.');
        document.getElementById('playerInfo').innerHTML = ''; // Limpar as informações do jogador
    } catch (error) {
        console.error('Error deleting document:', error);
        alert('Erro ao deletar jogador.');
    }
}
