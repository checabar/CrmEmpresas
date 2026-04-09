// =============================================
// API SETTINGS MANAGER - CRM Distribuidores Checa
// =============================================

var OPENAI_API_KEY = "";
var SERPER_API_KEY = "";
var PROXY_SEARCH_URL = "";

(function loadKeys() {
    try {
        // ÚNICA FUENTE DE VERDAD: localStorage (Panel de Configuración)
        // Esto asegura que el comportamiento sea igual en PC y Móvil.

        const localOK = localStorage.getItem('crm_openai_key');
        if (localOK) {
            OPENAI_API_KEY = localOK.trim();
        }

        const localSK = localStorage.getItem('crm_serper_key');
        if (localSK) {
            SERPER_API_KEY = localSK.trim();
        }

        // Informar estado en consola
        if (OPENAI_API_KEY) console.log('[OK] OpenAI key cargada desde panel');
        if (SERPER_API_KEY) console.log('[OK] Serper key cargada desde panel');

        // Actualizar UI de estado
        var statusDiv = document.getElementById('apiStatus');
        if (statusDiv) {
            if (OPENAI_API_KEY && SERPER_API_KEY) {
                statusDiv.textContent = 'Modo IA Activado (OpenAI + Serper)';
                statusDiv.className = 'api-status active';
            } else if (OPENAI_API_KEY) {
                statusDiv.textContent = 'Modo IA Activado (OpenAI)';
                statusDiv.className = 'api-status active';
            } else {
                statusDiv.textContent = 'Modo Offline';
                statusDiv.className = 'api-status';
            }
        }
    } catch (e) {
        console.error('Error cargando claves:', e);
    }
})();
