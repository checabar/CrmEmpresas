// ============================================================================
// AGREGAR NUEVO DISTRIBUIDOR
// Maneja el modal y la lógica para crear nuevos distribuidores
// ============================================================================

(function () {
    'use strict';

    // Referencias DOM
    const btnAddDistributor = document.getElementById('btnAddDistributor');
    const addDistributorModal = document.getElementById('addDistributorModal');
    const btnCloseAddModal = document.getElementById('btnCloseAddModal');
    const btnCancelAdd = document.getElementById('btnCancelAdd');
    const addDistributorForm = document.getElementById('addDistributorForm');

    // Campos del formulario
    const newNombre = document.getElementById('newNombre');
    const newProvincia = document.getElementById('newProvincia');
    const newCiudad = document.getElementById('newCiudad');
    const newCategoria = document.getElementById('newCategoria');
    const newLinkGoogle = document.getElementById('newLinkGoogle');

    // ========================================================================
    // ABRIR MODAL
    // ========================================================================
    if (btnAddDistributor) {
        btnAddDistributor.addEventListener('click', function () {
            openAddModal();
        });
    }

    function openAddModal() {
        // Limpiar formulario
        addDistributorForm.reset();

        // Mostrar modal
        addDistributorModal.style.display = 'flex';

        // Focus en primer campo
        setTimeout(() => {
            newNombre.focus();
        }, 100);
    }

    // ========================================================================
    // CERRAR MODAL
    // ========================================================================
    function closeAddModal() {
        addDistributorModal.style.display = 'none';
        addDistributorForm.reset();
    }

    // Botón X
    if (btnCloseAddModal) {
        btnCloseAddModal.addEventListener('click', closeAddModal);
    }

    // Botón Cancelar
    if (btnCancelAdd) {
        btnCancelAdd.addEventListener('click', closeAddModal);
    }

    // Click fuera del modal
    if (addDistributorModal) {
        addDistributorModal.addEventListener('click', function (e) {
            if (e.target === addDistributorModal) {
                closeAddModal();
            }
        });
    }

    // ========================================================================
    // GUARDAR NUEVO DISTRIBUIDOR
    // ========================================================================
    if (addDistributorForm) {
        addDistributorForm.addEventListener('submit', function (e) {
            e.preventDefault();

            // Validar campos requeridos
            if (!newNombre.value.trim()) {
                alert('⚠️ El nombre es obligatorio');
                newNombre.focus();
                return;
            }

            if (!newProvincia.value) {
                alert('⚠️ La provincia es obligatoria');
                newProvincia.focus();
                return;
            }

            if (!newCiudad.value.trim()) {
                alert('⚠️ La ciudad es obligatoria');
                newCiudad.focus();
                return;
            }

            if (!newCategoria.value) {
                alert('⚠️ La categoría es obligatoria');
                newCategoria.focus();
                return;
            }

            // Crear objeto distribuidor
            const nuevoDistribuidor = {
                id: (typeof generateID === 'function')
                    ? generateID(newNombre.value, newProvincia.value, newCiudad.value)
                    : 'dist_' + Date.now(),
                nombre: newNombre.value.trim(),
                provincia: newProvincia.value,
                ciudad: newCiudad.value.trim(),
                categoria: newCategoria.value,
                link_google: newLinkGoogle.value.trim() || '',
                estado: 'pendiente',
                etapa_pipeline: 'nuevo',
                probabilidad: 0,
                puntaje: 0,
                responsable_comercial: '',
                nombre_contacto: '',
                telefono_contacto: '',
                email_contacto: '',
                fecha_ultimo_contacto: null,
                proxima_accion: '',
                fecha_proxima_accion: null,
                notas_comerciales: '',
                fecha_creacion: new Date().toISOString(),
                historial_contactos: [],
                inactivo: false
            };

            // Agregar a los datos globales (allData está en app_new.js)
            if (typeof allData !== 'undefined') {
                allData.push(nuevoDistribuidor);

                // Marcar cambios y refrescar vista
                if (typeof markAsDirty === 'function') markAsDirty();
                if (typeof loadLocalData === 'function') loadLocalData();

                alert(`✅ Distribuidor "${nuevoDistribuidor.nombre}" agregado.\n\nRecordá hacer click en "Guardar Base" para persistir los cambios.`);
                closeAddModal();

            } else {
                console.error('❌ allData no definido');
                alert('❌ Error de sistema: no se pudo acceder a la base.');
            }
        });
    }

    // ========================================================================
    // UTILIDADES
    // ========================================================================
    function generateId() {
        // Generar ID único basado en timestamp y random
        return 'dist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // ========================================================================
    // ATAJOS DE TECLADO
    // ========================================================================
    document.addEventListener('keydown', function (e) {
        // ESC para cerrar modal
        if (e.key === 'Escape' && addDistributorModal.style.display === 'flex') {
            closeAddModal();
        }
    });

})();
