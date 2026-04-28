// ============================================================================
// AGREGAR NUEVA EMPRESA
// Maneja el modal y la lógica para crear nuevas empresas
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
    const newCategoria = document.getElementById('newCategoria');
    const newDireccion = document.getElementById('newDireccion');
    const newBarrio = document.getElementById('newBarrio');
    const newTelefono = document.getElementById('newTelefono');
    const newEmpleados = document.getElementById('newEmpleados');
    const newLinkGoogle = document.getElementById('newLinkGoogle');
    const newLinkBusqueda = document.getElementById('newLinkBusqueda');

    // ========================================================================
    // ABRIR MODAL
    // ========================================================================
    if (btnAddDistributor) {
        btnAddDistributor.addEventListener('click', function () {
            openAddModal();
        });
    }

    function openAddModal() {
        addDistributorForm.reset();
        addDistributorModal.style.display = 'flex';
        setTimeout(() => { newNombre.focus(); }, 100);
    }

    // ========================================================================
    // CERRAR MODAL
    // ========================================================================
    function closeAddModal() {
        addDistributorModal.style.display = 'none';
        addDistributorForm.reset();
    }

    if (btnCloseAddModal) btnCloseAddModal.addEventListener('click', closeAddModal);
    if (btnCancelAdd) btnCancelAdd.addEventListener('click', closeAddModal);

    if (addDistributorModal) {
        addDistributorModal.addEventListener('click', function (e) {
            if (e.target === addDistributorModal) closeAddModal();
        });
    }

    // ========================================================================
    // GUARDAR NUEVA EMPRESA
    // ========================================================================
    if (addDistributorForm) {
        addDistributorForm.addEventListener('submit', function (e) {
            e.preventDefault();

            if (!newNombre.value.trim()) {
                alert('⚠️ El nombre es obligatorio');
                newNombre.focus();
                return;
            }

            if (!newCategoria.value.trim()) {
                alert('⚠️ La categoría/rubro es obligatorio');
                newCategoria.focus();
                return;
            }

            const nombre = newNombre.value.trim();
            const barrio = newBarrio.value.trim();
            const categoria = newCategoria.value.trim();

            const nuevaEmpresa = {
                id: (typeof generateID === 'function')
                    ? generateID(nombre, barrio, categoria)
                    : 'emp_' + Date.now(),
                nombre: nombre,
                categoria: categoria,
                direccion: newDireccion.value.trim(),
                barrio: barrio,
                telefono_empresa: newTelefono.value.trim(),
                cantidad_empleados: newEmpleados.value,
                link_google: newLinkGoogle.value.trim(),
                link_busqueda_empleados: newLinkBusqueda.value.trim(),
                estado: 'pendiente',
                etapa_pipeline: 'nuevo',
                probabilidad: 0,
                responsable_comercial: '',
                nombre_contacto: '',
                email_contacto: '',
                fecha_ultimo_contacto: null,
                proxima_accion: '',
                fecha_proxima_accion: null,
                notas_comerciales: '',
                fecha_creacion: new Date().toISOString(),
                historial_contactos: [],
                inactivo: false
            };

            if (window.CRM_IS_CLOUD_ACTIVE) {
                db.collection(CURRENT_COLLECTION).doc(nuevaEmpresa.id).set(nuevaEmpresa)
                    .then(() => {
                        console.log('✅ Empresa agregada a Firebase');
                        closeAddModal();
                    })
                    .catch((error) => {
                        console.error('❌ Error agregando a Firebase:', error);
                        alert('Error al guardar en la nube: ' + error.message);
                    });
            } else {
                // Modo local
                allData.push(nuevaEmpresa);
                closeAddModal();
                if (typeof loadLocalData === 'function') loadLocalData();
            }
        });
    }

    // ========================================================================
    // ATAJOS DE TECLADO
    // ========================================================================
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && addDistributorModal.style.display === 'flex') {
            closeAddModal();
        }
    });

})();
