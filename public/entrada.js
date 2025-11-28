// script.js - Funcionalidades para a página inicial

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Sistema GRAGAS Barbearia inicializado');

    // Inicializar componentes
    initializeLogo();
    initializeButtons();
    initializeAnimations();
    initializeAccessStats();
});

// Gerenciamento da logo
function initializeLogo() {
    const logoImg = document.getElementById('logoImg');

    if (logoImg) {
        // Verificar se a imagem carrega corretamente
        logoImg.onerror = function() {
            console.warn('⚠️ Imagem da logo não encontrada. Usando fallback de texto.');
            showTextLogo();
        };

        // Adicionar efeito de clique na logo
        logoImg.addEventListener('click', function() {
            animateLogo();
        });
    } else {
        // Se não há imagem, mostrar logo de texto
        showTextLogo();
    }
}

function showTextLogo() {
    const logoContainer = document.querySelector('.logo');
    if (logoContainer) {
        logoContainer.innerHTML = `
            <div class="logo-icon">✂️</div>
            <div class="logo-text">GRAGAS</div>
            <div class="logo-subtitle">Barbearia Premium</div>
        `;
    }
}

function animateLogo() {
    const logo = document.querySelector('.logo-image img') || document.querySelector('.logo-icon');
    if (logo) {
        logo.style.transform = 'scale(1.1)';
        setTimeout(() => {
            logo.style.transform = 'scale(1)';
        }, 300);
    }
}

// Gerenciamento dos botões
function initializeButtons() {
    const buttons = document.querySelectorAll('.btn');

    buttons.forEach(button => {
        // Efeito de loading ao clicar
        button.addEventListener('click', function(e) {
            // Verificar se o link é válido
            const href = this.getAttribute('href');
            if (!href || href === '#') {
                e.preventDefault();
                showButtonError(this, 'Página em desenvolvimento');
                return;
            }

            // Simular loading para páginas externas
            if (href.startsWith('http')) {
                e.preventDefault();
                simulateNavigation(this, href);
            }
        });

        // Efeito de hover com sombra
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px)';
        });

        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

function simulateNavigation(button, url) {
    const originalText = button.innerHTML;

    // Mostrar estado de loading
    button.innerHTML = '<i class="fas fa-spinner"></i> Redirecionando...';
    button.classList.add('loading');

    // Simular delay de navegação
    setTimeout(() => {
        window.location.href = url;
    }, 1500);
}

function showButtonError(button, message) {
    const originalText = button.innerHTML;
    const originalBg = button.style.backgroundColor;

    button.innerHTML = `❌ ${message}`;
    button.style.backgroundColor = '#666';

    setTimeout(() => {
        button.innerHTML = originalText;
        button.style.backgroundColor = originalBg;
    }, 2000);
}

// Animações e efeitos visuais
function initializeAnimations() {
    // Adicionar efeito de digitação no subtítulo
    const subtitle = document.querySelector('.logo-subtitle');
    if (subtitle) {
        typeWriter(subtitle, subtitle.textContent, 50);
    }

    // Efeito de parallax no background
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const background = document.body;
        background.style.backgroundPosition = `center ${scrolled * 0.5}px`;
    });
}

function typeWriter(element, text, speed) {
    let i = 0;
    element.textContent = '';

    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }

    type();
}

// Estatísticas de acesso (localStorage)
function initializeAccessStats() {
    // Registrar acesso atual
    const accessCount = parseInt(localStorage.getItem('gragas_access_count') || '0') + 1;
    localStorage.setItem('gragas_access_count', accessCount.toString());
    localStorage.setItem('gragas_last_access', new Date().toISOString());

    // Mostrar estatísticas no console (apenas desenvolvimento)
    if (accessCount === 1) {
        console.log('👋 Bem-vindo ao Sistema GRAGAS! Primeiro acesso.');
    } else {
        console.log(`🔢 Acessos totais: ${accessCount}`);
    }
}

// Utilidades extras
function showWelcomeMessage() {
    const now = new Date();
    const hour = now.getHours();
    let greeting;

    if (hour < 12) greeting = 'Bom dia';
    else if (hour < 18) greeting = 'Boa tarde';
    else greeting = 'Boa noite';

    console.log(`${greeting}! Sistema GRAGAS pronto para uso.`);
}

// Exportar funções para uso global (se necessário)
window.GragasSystem = {
    initializeLogo,
    initializeButtons,
    showWelcomeMessage
};

// Inicialização final
setTimeout(showWelcomeMessage, 1000);