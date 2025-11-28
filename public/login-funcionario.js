document.addEventListener('DOMContentLoaded', function() {
    // Login - ATUALIZADA para usar nome e SENHA
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        const nome = document.getElementById('nomeLogin').value.trim();
        const senha = document.getElementById('senhaLogin').value;

        clearMessages();

        if (!nome || !senha) {
            showMessage('loginError', 'Por favor, preencha todos os campos.');
            return;
        }

        try {
            const response = await fetch('/login-barbeiro', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ nome, senha })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showMessage('loginSuccess', 'Login realizado com sucesso! Redirecionando...');

                // Salvar dados do usuário no localStorage
                localStorage.setItem('user', JSON.stringify(data.user));
                console.log('Usuário logado:', data.user);

                // Redirecionar baseado no cargo
                setTimeout(() => {
                    redirectByCargo(data.user.cargo);
                }, 1500);

            } else {
                showMessage('loginError', data.message || 'Nome ou senha incorretos.');
            }
        } catch (error) {
            console.error('Erro no login:', error);
            showMessage('loginError', 'Erro de conexão. Tente novamente.');
        }
    });

    function showMessage(elementId, message) {
        const element = document.getElementById(elementId);
        element.textContent = message;
        element.style.display = 'block';

        // Auto-esconder mensagens de sucesso após 5 segundos
        if (element.classList.contains('success-message')) {
            setTimeout(() => {
                element.style.display = 'none';
            }, 5000);
        }
    }

    function clearMessages() {
        document.querySelectorAll('.message').forEach(msg => {
            msg.style.display = 'none';
        });
    }

    function redirectByCargo(cargo) {
        console.log('Redirecionando usuário com cargo:', cargo);

        // Gerente vai para index.html
        if (cargo === 'Gerente' || cargo === 'gerente') {
            window.location.href = 'index.html';
        } 
        // Qualquer outro cargo (Barbeiro, Cabeleireiro, Recepcionista, etc) vai para index2.html
        else {
            window.location.href = 'index2.html';
        }
    }

    // Verificar se já está logado
    checkExistingSession();

    function checkExistingSession() {
        const user = localStorage.getItem('user');
        if (user) {
            try {
                const userData = JSON.parse(user);
                console.log('Usuário já logado:', userData);
                // Não redirecionar automaticamente - usuário precisa fazer login novamente
            } catch (e) {
                console.error('Erro ao ler dados do usuário:', e);
                localStorage.removeItem('user');
            }
        }
    }

    console.log('Sistema de login carregado com sucesso');
});