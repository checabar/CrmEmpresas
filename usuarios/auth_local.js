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

    console.log(window.CRM_IS_CLOUD_ACTIVE ? '☁️ Auth: Cloud mode + Login Local.' : '🔓 Auth: Local Mode active.');

    // Desbloquear si ya hay sesión guardada
    if (localStorage.getItem('crm_local_session') === 'true') {
        unlockApp();
    }

    // Credenciales locales (modificar acá para cambiarlas)
    const LOCAL_USERS = [
        { id: 'Milton', user: 'Milton', pass: 'checabar' },
        { id: 'Juancho', user: 'Juancho', pass: 'checabar' },
        { id: 'Jose', user: 'Jose', pass: 'checabar' }
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
            setTimeout(() => { overlay.style.display = 'none'; }, 500);
        }
        document.body.classList.remove('not-logged-in');

        // Si hay cloud activo, cargar desde Firestore
        if (window.CRM_IS_CLOUD_ACTIVE) {
            if (typeof startRealtimeSync === 'function') {
                startRealtimeSync();
            }
        } else {
            if (typeof onBaseLoaded === 'function') {
                onBaseLoaded();
            }
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
