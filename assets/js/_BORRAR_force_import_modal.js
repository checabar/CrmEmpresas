// ============================================
// PATCH: Forzar modal de importación
// ============================================

// Sobrescribir la inicialización para forzar modal siempre
(function() {
    const originalDOMContentLoaded = document.addEventListener;
    
    // Interceptar cuando el app_secure.js intente cargar desde IndexedDB
    window.addEventListener('load', () => {
        // Limpiar IndexedDB al inicio para forzar flujo limpio
        const dbName = 'CRM_Distribuidores_DB';
        const request = indexedDB.deleteDatabase(dbName);
        
        request.onsuccess = () => {
            console.log('🔄 IndexedDB limpiado - Flujo limpio activado');
        };
        
        request.onerror = () => {
            console.log('⚠️ No se pudo limpiar IndexedDB');
        };
    });
})();
