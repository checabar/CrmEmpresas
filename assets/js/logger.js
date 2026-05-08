// ============================================
// CRM DISTRIBUIDORES - SISTEMA DE LOG
// Registra eventos, errores y diagnóstico
// Los logs se envían al servidor que los guarda en /logs/
// ============================================

const CRMLog = (function () {
    const LOG_ENDPOINT = '/crm-log';
    let sessionId = '';
    let logBuffer = [];
    let flushTimer = null;

    function init() {
        sessionId = 'S' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
        
        // Log de inicio con diagnóstico del sistema
        logEntry('INFO', 'SESSION_START', collectDiagnostics());

        // Capturar errores globales
        window.addEventListener('error', function (e) {
            logEntry('ERROR', 'JS_ERROR', {
                message: e.message,
                source: e.filename,
                line: e.lineno,
                col: e.colno,
                stack: e.error ? e.error.stack : null
            });
        });

        window.addEventListener('unhandledrejection', function (e) {
            logEntry('ERROR', 'PROMISE_REJECTION', {
                message: e.reason ? (e.reason.message || String(e.reason)) : 'Unknown',
                stack: e.reason ? e.reason.stack : null
            });
        });

        // Log cuando se cierra la pestaña
        window.addEventListener('beforeunload', function () {
            logEntry('INFO', 'SESSION_END', { duration: Math.round((Date.now() - parseInt(sessionId.substr(1), 36)) / 1000) + 's' });
            flushNow();
        });

        // Flush periódico cada 10 segundos
        flushTimer = setInterval(flushNow, 10000);

        console.log('[LOG] Sistema de log iniciado - Session: ' + sessionId);
    }

    function collectDiagnostics() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenSize: screen.width + 'x' + screen.height,
            windowSize: window.innerWidth + 'x' + window.innerHeight,
            protocol: window.location.protocol,
            url: window.location.href,
            fileSystemAccess: 'showOpenFilePicker' in window,
            cookiesEnabled: navigator.cookieEnabled,
            online: navigator.onLine,
            timestamp: new Date().toISOString()
        };
    }

    function logEntry(level, event, data) {
        const entry = {
            ts: new Date().toISOString(),
            session: sessionId,
            level: level,
            event: event,
            data: data || null
        };

        logBuffer.push(entry);

        // Log inmediato en consola
        const prefix = level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : 'ℹ️';
        console.log(`[LOG] ${prefix} ${event}`, data || '');

        // Flush inmediato si es error
        if (level === 'ERROR') {
            flushNow();
        }
    }

    function flushNow() {
        if (logBuffer.length === 0) return;

        const toSend = logBuffer.slice();
        logBuffer = [];

        // Solo funciona con servidor HTTP (no file://)
        if (!window.location.protocol.startsWith('http')) return;

        try {
            // Usar sendBeacon para que funcione incluso al cerrar
            const blob = new Blob([JSON.stringify(toSend)], { type: 'application/json' });
            const sent = navigator.sendBeacon(LOG_ENDPOINT, blob);

            if (!sent) {
                // Fallback a fetch
                fetch(LOG_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(toSend)
                }).catch(function () { /* silencioso */ });
            }
        } catch (e) {
            // Sin servidor de logs, no hacer nada
        }
    }

    // API pública
    return {
        init: init,
        info: function (event, data) { logEntry('INFO', event, data); },
        warn: function (event, data) { logEntry('WARN', event, data); },
        error: function (event, data) { logEntry('ERROR', event, data); },
        flush: flushNow
    };
})();

// Auto-inicializar
document.addEventListener('DOMContentLoaded', function () {
    CRMLog.init();
});
