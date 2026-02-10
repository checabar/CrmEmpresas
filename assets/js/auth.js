// ============================================
// AUTHENTICATION LOGIC - CRM CHECA
// ============================================

// Comprobar sesión activa DE INMEDIATO antes de nada
if (sessionStorage.getItem('crm_autenticado') !== 'true') {
    document.body.classList.add('not-logged-in');
}

(function () {
    const USER_REQUISITO = 'Checa';
    const PASS_REQUISITO = 'PuroEstilo';

    const overlay = document.getElementById('loginOverlay');
    const form = document.getElementById('loginForm');
    const errorDiv = document.getElementById('loginError');
    const userField = document.getElementById('loginUser');
    const passField = document.getElementById('loginPass');

    // Ajustar visibilidad inicial
    if (sessionStorage.getItem('crm_autenticado') === 'true') {
        if (overlay) overlay.style.display = 'none';
        document.body.classList.remove('not-logged-in');
    } else {
        if (overlay) overlay.style.display = 'flex';
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const user = userField.value;
        const pass = passField.value;

        if (user === USER_REQUISITO && pass === PASS_REQUISITO) {
            // Éxito
            sessionStorage.setItem('crm_autenticado', 'true');
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.5s ease';

            setTimeout(() => {
                overlay.style.display = 'none';
                document.body.classList.remove('not-logged-in');
            }, 500);

            console.log('✅ Acceso concedido');
        } else {
            // Error
            errorDiv.style.display = 'block';
            passField.value = '';
            passField.focus();

            // Efecto shake
            form.parentElement.style.animation = 'shake 0.4s ease';
            setTimeout(() => {
                form.parentElement.style.animation = '';
            }, 400);
        }
    });
})();

// Animación Shake para error
const style = document.createElement('style');
style.innerHTML = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
`;
document.head.appendChild(style);
