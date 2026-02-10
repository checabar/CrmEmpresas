// =============================================
// CONFIGURACION DE API KEYS - CRM Distribuidores Checa
// =============================================
// Las keys se cargan desde openai_key.txt y serper_key.txt
// Si corre en file:// usa las keys de respaldo de abajo.
// =============================================

// Las keys se cargan desde openai_key.txt y serper_key.txt en la carpeta /apis/
// No subir estos archivos a GitHub (están en el .gitignore).
// =============================================

var OPENAI_API_KEY = "";
var SERPER_API_KEY = "";
var PROXY_SEARCH_URL = "";


(async function loadKeys() {
    if (window.location.protocol.startsWith('http')) {
        try {
            var r1 = await fetch('apis/openai_key.txt');
            if (r1.ok) {
                var k = (await r1.text()).trim();
                if (k.startsWith('sk-')) { OPENAI_API_KEY = k; }
            }
        } catch(e) {}
        try {
            var r2 = await fetch('apis/serper_key.txt');
            if (r2.ok) {
                var k = (await r2.text()).trim();
                if (k.length > 10) { SERPER_API_KEY = k; }
            }
        } catch(e) {}
    }

    if (!OPENAI_API_KEY && _FALLBACK_OPENAI) OPENAI_API_KEY = _FALLBACK_OPENAI;
    if (!SERPER_API_KEY && _FALLBACK_SERPER) SERPER_API_KEY = _FALLBACK_SERPER;

    if (OPENAI_API_KEY) console.log('[OK] OpenAI key cargada');
    else console.log('[AVISO] Sin OpenAI key');
    if (SERPER_API_KEY) console.log('[OK] Serper key cargada');

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
})();
