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

    // Verificación de sesión INMEDIATA
    const hasSession = localStorage.getItem('crm_local_session') === 'true';

    if (!hasSession) {
        document.body.classList.add('show-login');
        console.log('🔒 Sin sesión. Mostrando login...');
    } else {
        console.log('🔄 Sesión activa detectada. Saltando login.');
        unlockApp();
    }

    // Botón de Cerrar Sesión
    document.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'btnLogout') {
            if (confirm('¿Querés cerrar sesión?')) {
                localStorage.removeItem('crm_local_session');
                location.reload();
            }
        }
    });

    // Credenciales locales (modificar acá para cambiarlas)
    const LOCAL_USERS = [
        { id: 'Milton', user: 'Milton', pass: 'checabar' },
        { id: 'Juancho', user: 'Juancho', pass: 'checabar' },
        { id: 'Jose', user: 'Jose', pass: 'checabar' },
        { id: 'Gabriel', user: 'Gabriel', pass: 'checabar' }
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
            overlay.style.display = 'none';
        }
        document.body.classList.remove('show-login');
        document.body.classList.remove('not-logged-in'); // Limpieza por compatibilidad

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
