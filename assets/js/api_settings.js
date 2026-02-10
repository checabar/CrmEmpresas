// ============================================
// API SETTINGS MANAGER - LOCAL STORAGE
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    const btnSettings = document.getElementById('btnSettings');
    const modal = document.getElementById('settingsModal');
    const btnClose = document.getElementById('btnCloseSettings');
    const btnSave = document.getElementById('btnSaveSettings');
    const btnClear = document.getElementById('btnClearSettings');

    const inputOpenAI = document.getElementById('inputOpenAI');
    const inputSerper = document.getElementById('inputSerper');

    if (!btnSettings) {
        console.error('❌ Error: El botón #btnSettings no se encontró en el DOM al cargar.');
        return;
    }

    console.log('✅ Configuración de API inicializada correctamente.');

    // Cargar valores actuales al abrir
    btnSettings.addEventListener('click', () => {
        console.log('⚙️ Abriendo configuración...');
        inputOpenAI.value = localStorage.getItem('crm_openai_key') || '';
        inputSerper.value = localStorage.getItem('crm_serper_key') || '';
        if (modal) modal.style.display = 'flex';
    });

    if (btnClose) {
        btnClose.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    // Cerrar al hacer clic fuera
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
    }

    if (btnSave) {
        btnSave.addEventListener('click', () => {
            const oKey = inputOpenAI.value.trim();
            const sKey = inputSerper.value.trim();

            if (oKey) localStorage.setItem('crm_openai_key', oKey);
            else localStorage.removeItem('crm_openai_key');

            if (sKey) localStorage.setItem('crm_serper_key', sKey);
            else localStorage.removeItem('crm_serper_key');

            alert('✅ Configuración guardada. La página se recargará para aplicar los cambios.');
            window.location.reload();
        });
    }

    if (btnClear) {
        btnClear.addEventListener('click', () => {
            if (confirm('¿Estás seguro de que quieres eliminar las claves guardadas en este dispositivo?')) {
                localStorage.removeItem('crm_openai_key');
                localStorage.removeItem('crm_serper_key');
                window.location.reload();
            }
        });
    }
});
