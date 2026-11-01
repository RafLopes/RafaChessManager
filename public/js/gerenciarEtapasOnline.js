document.addEventListener('DOMContentLoaded', async function() {
    const db = firebase.firestore();

    // Verificar autenticação e permissões
    firebase.auth().onAuthStateChanged(async function(user) {
        const adminContent = document.getElementById('admin-content');
        const notAuthorized = document.getElementById('not-authorized');

        if (user) {
            // Usuário está logado como admin
            adminContent.style.display = 'block';
            notAuthorized.style.display = 'none';
            
            // Carregar etapa atual
            await carregarEtapaAtual();
            
            // Adicionar listener ao formulário
            document.getElementById('etapa-form').addEventListener('submit', salvarEtapa);
        } else {
            // Usuário não autenticado
            adminContent.style.display = 'none';
            notAuthorized.style.display = 'block';
        }
    });

    // Função para carregar a etapa atual
    async function carregarEtapaAtual() {
        try {
            const doc = await db.collection('n_etapas_online').doc('etapa-atual').get();
            
            if (doc.exists) {
                const numero = doc.data().numero;
                document.getElementById('numero-etapa').value = numero;
                document.getElementById('current-etapa-display').textContent = numero;
            } else {
                document.getElementById('current-etapa-display').textContent = "—";
            }
        } catch (error) {
            console.error('Erro ao carregar etapa:', error);
            document.getElementById('current-etapa-display').textContent = "?";
        }
    }

    // Função para salvar a etapa
    async function salvarEtapa(event) {
        event.preventDefault();

        const numeroEtapa = parseInt(document.getElementById('numero-etapa').value);
        const successMessage = document.getElementById('success-message');
        const errorMessage = document.getElementById('error-message');

        // Limpar mensagens
        successMessage.style.display = 'none';
        errorMessage.style.display = 'none';

        try {
            // Salvar no Firestore
            await db.collection('n_etapas_online').doc('etapa-atual').set({
                numero: numeroEtapa,
                ultimaAtualizacao: new Date(),
                atualizado_por: firebase.auth().currentUser.email
            });

            console.log(`Etapa ${numeroEtapa} salva com sucesso!`);
            
            // Atualizar display
            document.getElementById('current-etapa-display').textContent = numeroEtapa;
            
            // Mostrar mensagem de sucesso
            successMessage.style.display = 'block';
            setTimeout(() => {
                successMessage.style.display = 'none';
            }, 3000);

        } catch (error) {
            console.error('Erro ao salvar etapa:', error);
            errorMessage.textContent = `✗ Erro ao salvar: ${error.message}`;
            errorMessage.style.display = 'block';
        }
    }
});
