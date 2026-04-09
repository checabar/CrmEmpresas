// ============================================
// LOCAL AUTHENTICATION LOGIC - CRM BASE
// ============================================

(function () {
    console.log('🔓 Auth Local: v101 starting...');
    const overlay = document.getElementById('loginOverlay');
    const form = document.getElementById('loginForm');
    const errorDiv = document.getElementById('loginError');
    const userField = document.getElementById('loginUser');
    const passField = document.getElementById('loginPass');

    // MODO LOCAL: Si Firebase no está activo, usamos esta lógica
    if (window.CRM_IS_CLOUD_ACTIVE) {
        console.log('☁️ Auth: Cloud detected, skipping local auth initialization.');
        return;
    }

    console.log('🔓 Auth: Local Mode active.');

    // Desbloquear si ya hay sesión local en localStorage
    if (localStorage.getItem('crm_local_session') === 'true') {
        unlockApp();
    }

    // Credenciales locales (modificar acá para cambiarlas)
    const LOCAL_USERS = [
        { id: 'Jose', user: 'checa@crm.com', pass: '123456789' }
    ];

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const username = userField.value.trim();
        const password = passField.value;

        const match = LOCAL_USERS.find(u =>
            (u.user === username || u.user.split('@')[0] === username || u.id === username) &&
            u.pass === password
        );

        if (match) {
            console.log('✅ Acceso Local Concedido para:', username);
            localStorage.setItem('crm_local_session', 'true');
            unlockApp();
        } else {
            console.warn('❌ Acceso Local Denegado:', username);
            showError();
        }
    });

    function unlockApp() {
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 500);
        }
        document.body.classList.remove('not-logged-in');

        // Log de depuración
        console.log('🔓 unlockApp: Quitando overlay. baseLoaded:', typeof baseLoaded !== 'undefined' ? baseLoaded : 'unknown');

        // Si existe la función global onBaseLoaded, llamarla (ella verificará si hay datos)
        if (typeof onBaseLoaded === 'function') {
            onBaseLoaded();
        }
    }

    function showError() {
        errorDiv.style.display = 'block';
        errorDiv.textContent = 'Usuario o contraseña incorrectos';
        passField.value = '';
        passField.focus();

        form.parentElement.style.animation = 'shake 0.4s ease';
        setTimeout(() => {
            form.parentElement.style.animation = '';
        }, 400);
    }
})();
