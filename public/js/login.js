document.addEventListener('DOMContentLoaded', function() {
    // Verificar se já está logado como admin
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // Se estiver logado, redireciona para a página principal
            localStorage.setItem('userRole', 'admin');
            window.location.href = 'index.html';
        }
    });

    // Login com email/senha (código existente)
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('errorMessage');

        firebase.auth().signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Login bem-sucedido
                localStorage.setItem('userRole', 'admin');
                window.location.href = 'index.html';
            })
            .catch((error) => {
                // Tratar erros de login
                switch (error.code) {
                    case 'auth/wrong-password':
                        errorMessage.textContent = 'Senha incorreta.';
                        break;
                    case 'auth/user-not-found':
                        errorMessage.textContent = 'Usuário não encontrado.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage.textContent = 'Email inválido.';
                        break;
                    default:
                        errorMessage.textContent = 'Erro ao fazer login. Tente novamente.';
                }
            });
    });
}); 