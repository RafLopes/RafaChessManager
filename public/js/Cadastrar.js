// função que faz a leitura do banco de dados
async function readDB () {
    var db = firebase.firestore();
    var size = await sizeDB();
    console.log(size);

    for (var i = 1; i <= size; i++) {
        var docRef = db.collection('players').doc(i.toString());
        docRef.get().then(function (doc) {
            if (doc.exists) {
                console.log(doc.data());
            } else {
                console.log("No such document!");
            }
        }).catch(function (error) {
            console.log("Error getting document:", error);
        });
    }
}

//função que busca o maior ID do banco de dados
async function sizeDB() {
    var db = firebase.firestore();
    try {
        const querySnapshot = await db.collection('players').get();
        const ids = querySnapshot.docs.map(doc => parseInt(doc.id));
        
        // Se não houver documentos, retorna 0
        if (ids.length === 0) return 0;
        
        // Retorna o maior ID encontrado
        const maiorId = Math.max(...ids);
        console.log("Lista de IDs:", ids);
        console.log("Maior ID encontrado:", maiorId);
        return maiorId;
    } catch (error) {
        console.error("Erro ao buscar IDs:", error);
        return 0;
    }
}

// Função para verificar se já existe um jogador com o mesmo nome
async function verificarJogadorExistente(nome) {
    var db = firebase.firestore();
    try {
        // Buscar jogadores com o mesmo nome (case insensitive não é suportado diretamente, então comparamos exatamente)
        const querySnapshot = await db.collection('players')
            .where('Nome', '==', nome)
            .get();
        
        return !querySnapshot.empty; // Retorna true se encontrou algum jogador com o mesmo nome
    } catch (error) {
        console.error("Erro ao verificar jogador existente:", error);
        return false;
    }
}

async function writeDB () {
    // pegar os dados do formulario
    var nome = document.getElementById('name').value;
    var idade = document.getElementById('age').value;
    var rating = Number(document.getElementById('rating').value);
    var sexo = document.getElementById('gender').value;

    // Verificar se todos os campos estão preenchidos
    if (!nome || !idade || isNaN(rating) || !sexo) {
        showFeedback('Todos os campos devem ser preenchidos.', 'error');
        return;
    }

    try {
        // Verificar se já existe um jogador com o mesmo nome
        const jogadorExistente = await verificarJogadorExistente(nome);
        if (jogadorExistente) {
            showFeedback('Já existe um jogador cadastrado com este nome!', 'error');
            return;
        }

        var maiorId = await sizeDB();
        var novoId = (maiorId + 1).toString();
        var db = firebase.firestore();

        console.log("Maior ID atual:", maiorId);
        console.log("Novo ID:", novoId);

        // Aguardar a conclusão do cadastro
        await db.collection('players').doc(novoId).set({
            Idade: idade,
            Nome: nome,
            Rating: rating,
            sexo: sexo
        });

        showFeedback('Jogador cadastrado com sucesso!', 'success');
        
        // Aumentar o tempo de espera e garantir que o cadastro foi concluído
        await new Promise(resolve => setTimeout(resolve, 2000));
        window.location.reload();
        
    } catch (error) {
        console.error('Error adding document: ', error);
        showFeedback('Erro ao cadastrar jogador.', 'error');
    }
}

function showFeedback(message, type) {
    const feedbackDiv = document.getElementById('feedback');
    if (feedbackDiv) {
        feedbackDiv.textContent = message;
        feedbackDiv.className = `feedback alert alert-${type === 'error' ? 'danger' : 'success'}`;
    } else {
        console.error('Elemento de feedback não encontrado!');
    }
}

//função que escreve no banco de dados
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('playerForm');
    if (form) {
        form.addEventListener('submit', async function(event) {
            event.preventDefault(); // Prevenir o comportamento padrão do formulário
            await writeDB();
        });
    } else {
        console.error('Formulário não encontrado!');
    }
});
