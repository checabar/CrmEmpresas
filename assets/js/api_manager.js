// =============================================
// API SETTINGS MANAGER - CRM Distribuidores Checa
// =============================================

var OPENAI_API_KEY = "";
var SERPER_API_KEY = "";
var PROXY_SEARCH_URL = "";

(async function loadKeys() {
    try {
        if (window.location.protocol.startsWith('http')) {
            // 1. Intentar cargar desde archivos locales (Solo funciona en PC con local-server)
            try {
                var r1 = await fetch('apis/openai_key.txt');
                if (r1.ok) {
                    var k = (await r1.text()).trim();
                    if (k.startsWith('sk-')) { OPENAI_API_KEY = k; }
                }
            } catch (e) { }
            try {
                var r2 = await fetch('apis/serper_key.txt');
                if (r2.ok) {
                    var k = (await r2.text()).trim();
                    if (k.length > 10) { SERPER_API_KEY = k; }
                }
            } catch (e) { }

            // 2. Intentar cargar desde localStorage (Para móviles en GitHub Pages)
            if (!OPENAI_API_KEY) {
                const localOK = localStorage.getItem('crm_openai_key');
                if (localOK) OPENAI_API_KEY = localOK;
            }
            if (!SERPER_API_KEY) {
                const localSK = localStorage.getItem('crm_serper_key');
                if (localSK) SERPER_API_KEY = localSK;
            }
        }

        // Informar estado en consola
        if (OPENAI_API_KEY) console.log('[OK] OpenAI key cargada');
        else console.log('[AVISO] Sin OpenAI key');

        if (SERPER_API_KEY) console.log('[OK] Serper key cargada');
        else console.log('[AVISO] Sin Serper key');

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
