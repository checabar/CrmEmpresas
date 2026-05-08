// ============================================
// AUTHENTICATION LOGIC - CRM CHECA (FIREBASE)
// ============================================

(function () {
    const overlay = document.getElementById('loginOverlay');
    const form = document.getElementById('loginForm');
    const errorDiv = document.getElementById('loginError');
    const userField = document.getElementById('loginUser');
    const passField = document.getElementById('loginPass');

    // Si no hay Cloud activo, no hacemos nada (auth_local.js manejará el login local)
    if (!window.CRM_IS_CLOUD_ACTIVE || !auth) {
        console.log('🚪 Auth Cloud: Inactivo o Auth no inicializado. Esperando login local...');
        return;
    }

    // Escuchar el estado de autenticación de Firebase (Solo si Cloud está activo y auth inicializado)
    if (auth) {
        auth.onAuthStateChanged((user) => {
            if (user) {
                // Usuario logueado
                if (overlay) {
                    overlay.style.opacity = '0';
                    overlay.style.transition = 'opacity 0.5s ease';
                    setTimeout(() => {
                        overlay.style.display = 'none';
                    }, 500);
                }
                document.body.classList.remove('not-logged-in');
                console.log('✅ Sesión activa via Firebase:', user.email);
            } else {
                // Usuario no logueado
                document.body.classList.add('not-logged-in');
                if (overlay) overlay.style.display = 'flex';
            }
        });
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        let email = userField.value;
        const pass = passField.value;

        // Mapear usuario simple a email de Firebase
        if (email.toLowerCase() === 'checa') {
            email = 'checa@crm.com';
        } else if (!email.includes('@')) {
            email = email + '@crm.com';
        }

        if (!auth) {
            console.error('❌ Error Auth: Firebase auth non initialized');
            showError();
            return;
        }

        auth.signInWithEmailAndPassword(email, pass)
            .then((userCredential) => {
                console.log('✅ Acceso concedido via Firebase');
            })
            .catch((error) => {
                console.error('❌ Error Auth:', error.code, error.message);
                errorDiv.style.display = 'block';
                errorDiv.textContent = 'Usuario o contraseña incorrectos';
                passField.value = '';
                passField.focus();

                // Efecto shake
                form.parentElement.style.animation = 'shake 0.4s ease';
                setTimeout(() => {
                    form.parentElement.style.animation = '';
                }, 400);
            });
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
