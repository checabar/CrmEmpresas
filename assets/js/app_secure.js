// ============================================
// CRM DISTRIBUIDORES - CHECA
// Modo Dropbox: Cargar Base → Trabajar → Guardar Base
// Usa File System Access API para leer/escribir directo al archivo
// ============================================

let currentFileHandle = null;
let currentDistributor = null;
let allData = [];
let filteredData = [];
let cachedApiKey = null;
let isDirty = false;
let baseLoaded = false;

// Lista fija de responsables comerciales
const RESPONSABLES = ['Juan Cruz', 'Franco', 'Pablo', 'Santiago', 'Mai'];

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Iniciando CRM Distribuidores...');

    try {
        setupEventListeners();

        if (!('showOpenFilePicker' in window)) {
            console.warn('⚠️ File System Access API no disponible. Usando modo fallback (descarga).');
        }

        window.addEventListener('beforeunload', (e) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '¡Tenés cambios sin guardar! ¿Seguro que querés salir?';
            }
        });

        console.log('✅ CRM listo. Esperando carga de base...');
    } catch (error) {
        console.error('❌ Error en inicialización:', error);
    }
});

// ============================================
// CARGAR BASE
// ============================================

async function loadDatabase() {
    try {
        if ('showOpenFilePicker' in window) {
            // === File System Access API ===
            const [handle] = await window.showOpenFilePicker({
                types: [{
                    description: 'Base de datos JSON',
                    accept: { 'application/json': ['.json'] }
                }],
                multiple: false
            });

            // Pedir permisos de escritura
            const permStatus = await handle.queryPermission({ mode: 'readwrite' });
            if (permStatus !== 'granted') {
                const reqStatus = await handle.requestPermission({ mode: 'readwrite' });
                if (reqStatus !== 'granted') {
                    alert('⚠️ Sin permisos de escritura.\nAl guardar se va a descargar el archivo y vas a tener que reemplazarlo manualmente.');
                }
            }

            const file = await handle.getFile();
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data.items || !Array.isArray(data.items)) {
                throw new Error('Formato inválido. El archivo debe tener un array "items".');
            }

            currentFileHandle = handle;
            allData = data.items;

            const lastMod = data.meta?.updated_at 
                ? new Date(data.meta.updated_at).toLocaleString('es-AR')
                : new Date(file.lastModified).toLocaleString('es-AR');

            document.getElementById('lastUpdate').textContent = `Última actualización: ${lastMod}`;

            baseLoaded = true;
            isDirty = false;
            onBaseLoaded();

            console.log(`✅ Base cargada: ${allData.length} registros desde "${handle.name}"`);
            if (window.CRMLog) CRMLog.info('DB_LOADED', { records: allData.length, file: handle.name, method: 'FileSystemAccess' });

        } else {
            // === Fallback: input file ===
            loadDatabaseFallback();
        }

    } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('❌ Error cargando base:', error);
        if (window.CRMLog) CRMLog.error('DB_LOAD_ERROR', { message: error.message, name: error.name, stack: error.stack });
        alert('❌ Error al cargar el archivo:\n\n' + error.message);
    }
}

function loadDatabaseFallback() {
    const input = document.getElementById('fileInputFallback');
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data.items || !Array.isArray(data.items)) {
                throw new Error('Formato inválido.');
            }

            currentFileHandle = null;
            allData = data.items;

            const lastMod = data.meta?.updated_at 
                ? new Date(data.meta.updated_at).toLocaleString('es-AR')
                : new Date(file.lastModified).toLocaleString('es-AR');

            document.getElementById('lastUpdate').textContent = `Última actualización: ${lastMod}`;

            baseLoaded = true;
            isDirty = false;
            onBaseLoaded();

            console.log(`✅ Base cargada (fallback): ${allData.length} registros`);
        } catch (error) {
            alert('❌ Error al cargar: ' + error.message);
        }

        input.value = '';
    };
    input.click();
}

// ============================================
// GUARDAR BASE
// ============================================

async function saveDatabase() {
    if (!baseLoaded || allData.length === 0) {
        alert('⚠️ No hay datos para guardar.');
        return;
    }

    const payload = {
        meta: {
            updated_at: new Date().toISOString(),
            updated_by: 'CRM User',
            schema: 'CHECA_CRM_DB_V1'
        },
        items: allData
    };

    const jsonString = JSON.stringify(payload, null, 2);

    try {
        if (currentFileHandle) {
            // === Sobreescribir directo ===
            const perm = await currentFileHandle.queryPermission({ mode: 'readwrite' });
            if (perm !== 'granted') {
                const req = await currentFileHandle.requestPermission({ mode: 'readwrite' });
                if (req !== 'granted') {
                    alert('⚠️ Sin permiso de escritura. Se descarga el archivo.');
                    downloadFallback(jsonString);
                    return;
                }
            }

            const writable = await currentFileHandle.createWritable();
            await writable.write(jsonString);
            await writable.close();

            isDirty = false;
            updateStatus('saved');

            const now = new Date().toLocaleString('es-AR');
            document.getElementById('lastUpdate').textContent = `Última actualización: ${now}`;

            // Feedback visual en botón
            const btnSave = document.getElementById('btnSaveDB');
            const originalText = btnSave.innerHTML;
            btnSave.innerHTML = '✅ Guardado!';
            btnSave.style.background = '#10b981';
            setTimeout(() => {
                btnSave.innerHTML = originalText;
                btnSave.style.background = '';
            }, 2500);

            console.log('✅ Base guardada directamente.');
            if (window.CRMLog) CRMLog.info('DB_SAVED', { records: allData.length, method: 'FileSystemAccess' });

        } else {
            // === Fallback: descargar ===
            downloadFallback(jsonString);
        }

    } catch (error) {
        console.error('❌ Error guardando:', error);
        if (window.CRMLog) CRMLog.error('DB_SAVE_ERROR', { message: error.message, name: error.name });
        if (confirm('❌ Error al guardar.\n\n¿Descargar el archivo para reemplazarlo manualmente?')) {
            downloadFallback(jsonString);
        }
    }
}

function downloadFallback(jsonString) {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'db.json';
    a.click();
    URL.revokeObjectURL(url);

    isDirty = false;
    updateStatus('saved');
    alert('✅ Archivo descargado.\n\nReemplazá "db.json" en tu carpeta de Dropbox.');
}

// ============================================
// TRANSICIONES DE PANTALLA
// ============================================

function onBaseLoaded() {
    // Ocultar welcome, mostrar contenido y header actions
    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
    document.getElementById('headerActions').style.display = 'flex';

    updateStatus('loaded');
    loadLocalData();
}

// ============================================
// ESTADO VISUAL
// ============================================

function updateStatus(status) {
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');

    if (!dot) return;

    dot.className = 'status-dot';

    if (status === 'loaded' || status === 'saved') {
        dot.classList.add('connected');
        text.textContent = `Base cargada — ${allData.length} registros`;
    } else if (status === 'dirty') {
        dot.classList.add('dirty');
        text.textContent = `⚠️ Cambios sin guardar`;
    }
}

function markAsDirty() {
    isDirty = true;
    updateStatus('dirty');
}

// ============================================
// CORE DATA
// ============================================

function loadLocalData() {
    filteredData = allData.filter(d => !d.inactivo);
    renderTable();
    updateDashboard();
    populateDashboardFilters();
    populateFilters();
}

async function updateField(id, field, value) {
    const item = allData.find(d => d.id === id);
    if (!item) return;

    item[field] = value;
    if (field === 'estado' && value === 'contactado' && !item.fecha_ultimo_contacto) {
        item.fecha_ultimo_contacto = new Date().toISOString();
    }

    markAsDirty();
    updateDashboard();
}

// ============================================
// UTILIDADES
// ============================================

function generateID(nombre, provincia, ciudad) {
    const normalize = (str) => (str || '').toString().toLowerCase().trim().replace(/\s+/g, '');
    const combined = normalize(nombre) + normalize(provincia) + normalize(ciudad);
    return 'dist_' + Math.abs(simpleHash(combined)).toString(36);
}

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}

function formatDate(date) {
    if (!date) return '';
    try {
        const d = new Date(date);
        return isNaN(d) ? '' : d.toISOString().split('T')[0];
    } catch { return ''; }
}

function formatDateTime(date) {
    if (!date) return '';
    return new Date(date).toLocaleString('es-AR');
}

// ============================================
// RENDER TABLE
// ============================================

function renderTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (filteredData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:2rem; color:#999;">No hay datos para mostrar</td></tr>';
        return;
    }

    filteredData.forEach(dist => {
        const row = document.createElement('tr');

        // Estado: usar último resultado del log si existe, sino el campo estado
        const ultimoLog = (dist.historial_contactos && dist.historial_contactos.length > 0)
            ? dist.historial_contactos[0].resultado
            : null;
        const estadoMostrar = ultimoLog || dist.estado || 'pendiente';
        const estadoLabel = {
            'pendiente': 'Pendiente',
            'contactado': 'Contactado',
            'sin_respuesta': 'Sin respuesta',
            'interesado': 'Interesado',
            'pide_precio': 'Pide precio',
            'no_interesa': 'No interesa',
            'seguir_contacto': 'Seguir contacto',
            'cierre': 'Cierre'
        };

        // Responsable: select fijo
        const respOptions = RESPONSABLES.map(r => 
            `<option value="${r}" ${dist.responsable_comercial === r ? 'selected' : ''}>${r}</option>`
        ).join('');

        row.innerHTML = `
            <td><strong>${dist.nombre}</strong></td>
            <td>${dist.provincia}</td>
            <td>${dist.ciudad}</td>
            <td>${dist.puntaje || 0}</td>
            <td>${dist.categoria}</td>
            <td>
                <span class="badge-estado badge-${estadoMostrar}">${estadoLabel[estadoMostrar] || estadoMostrar}</span>
            </td>
            <td>
                <select onchange="updateField('${dist.id}', 'responsable_comercial', this.value)" style="min-width:100px;">
                    <option value="" ${!dist.responsable_comercial ? 'selected' : ''}>Sin asignar</option>
                    ${respOptions}
                </select>
            </td>
            <td>
                <span class="badget-stage">${dist.etapa_pipeline || 'nuevo'}</span>
            </td>
            <td class="action-btns">
                <button class="btn-icon" onclick="openDrawer('${dist.id}')">📝</button>
                <button class="btn-icon" onclick="openGoogle('${dist.link_google}')">🌐</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function openGoogle(link) {
    if (link) window.open(link, '_blank');
    else alert('No hay link de Google Maps');
}

function updateDashboard(dataToUse = null) {
    const data = dataToUse || allData.filter(d => !d.inactivo);
    document.getElementById('kpiTotal').textContent = data.length;
    document.getElementById('kpiContactados').textContent = data.filter(d => d.estado === 'contactado').length;
    document.getElementById('kpiPendientes').textContent = data.filter(d => d.estado === 'pendiente').length;
    document.getElementById('kpiNegociacion').textContent = data.filter(d => d.etapa_pipeline === 'negociacion').length;

    if (window.renderCharts) window.renderCharts(data);
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Botones de carga/guardado
    document.getElementById('btnImportDB')?.addEventListener('click', loadDatabase);
    document.getElementById('btnWelcomeLoad')?.addEventListener('click', loadDatabase);
    document.getElementById('btnSaveDB')?.addEventListener('click', saveDatabase);

    // Filtros tabla
    document.getElementById('filterNombre')?.addEventListener('input', applyFilters);
    ['filterProvincia', 'filterCategoria', 'filterEstado', 'filterResponsable'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', applyFilters);
    });
    document.getElementById('btnClearFilters')?.addEventListener('click', () => {
        ['filterNombre', 'filterProvincia', 'filterCategoria', 'filterEstado', 'filterResponsable'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        applyFilters();
    });

    // Drawer
    document.getElementById('btnCloseDrawer')?.addEventListener('click', closeDrawer);
    document.getElementById('btnSaveDrawer')?.addEventListener('click', saveDrawer);
    document.getElementById('btnAddLog')?.addEventListener('click', addLogEvento);

    // Dashboard Filters
    ['dashFilterCategoria', 'dashFilterResponsable', 'dashFilterEstado', 'dashFilterProvincia'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', (e) => {
            const field = id.replace('dashFilter', '').toLowerCase();
            dashFilters[field] = e.target.value;
            applyDashboardFilters();
        });
    });

    document.getElementById('btnClearDashFilters')?.addEventListener('click', () => {
        dashFilters = { categoria: '', responsable: '', estado: '', provincia: '' };
        ['dashFilterCategoria', 'dashFilterResponsable', 'dashFilterEstado', 'dashFilterProvincia'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        applyDashboardFilters();
    });

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
        });
    });
}

function applyFilters() {
    const filters = {
        nombre: document.getElementById('filterNombre')?.value.toLowerCase() || '',
        provincia: document.getElementById('filterProvincia')?.value || '',
        categoria: document.getElementById('filterCategoria')?.value || '',
        estado: document.getElementById('filterEstado')?.value || '',
        responsable: document.getElementById('filterResponsable')?.value || ''
    };

    filteredData = allData.filter(d => {
        if (d.inactivo) return false;
        if (filters.nombre && !d.nombre.toLowerCase().includes(filters.nombre)) return false;
        if (filters.provincia && d.provincia !== filters.provincia) return false;
        if (filters.categoria && d.categoria !== filters.categoria) return false;
        if (filters.estado && d.estado !== filters.estado) return false;
        if (filters.responsable && d.responsable_comercial !== filters.responsable) return false;
        return true;
    });

    renderTable();
}

// ============================================
// DRAWER
// ============================================

window.openDrawer = function (id) {
    const dist = allData.find(d => d.id === id);
    if (!dist) return;
    currentDistributor = dist;

    document.getElementById('drawerTitle').textContent = dist.nombre;
    document.getElementById('drawerEstado').value = dist.estado || 'pendiente';
    document.getElementById('drawerEtapa').value = dist.etapa_pipeline || 'nuevo';
    document.getElementById('drawerProbabilidad').value = dist.probabilidad || 0;
    document.getElementById('drawerResponsable').value = dist.responsable_comercial || '';

    document.getElementById('drawerNombreContacto').value = dist.nombre_contacto || '';
    document.getElementById('drawerTelefono').value = dist.telefono_contacto || '';
    document.getElementById('drawerEmail').value = dist.email_contacto || '';
    document.getElementById('drawerFechaContacto').value = formatDate(dist.fecha_ultimo_contacto);
    document.getElementById('drawerProximaAccion').value = dist.proxima_accion || '';
    document.getElementById('drawerFechaProximaAccion').value = formatDate(dist.fecha_proxima_accion);
    document.getElementById('drawerNotas').value = dist.notas_comerciales || '';

    renderLogContactos();
    document.getElementById('drawerOverlay').style.display = 'flex';
};

function closeDrawer() {
    document.getElementById('drawerOverlay').style.display = 'none';
    currentDistributor = null;
}

function saveDrawer() {
    if (!currentDistributor) return;

    currentDistributor.estado = document.getElementById('drawerEstado').value;
    currentDistributor.etapa_pipeline = document.getElementById('drawerEtapa').value;
    currentDistributor.probabilidad = parseInt(document.getElementById('drawerProbabilidad').value) || 0;
    currentDistributor.responsable_comercial = document.getElementById('drawerResponsable').value;
    currentDistributor.nombre_contacto = document.getElementById('drawerNombreContacto').value;
    currentDistributor.telefono_contacto = document.getElementById('drawerTelefono').value;
    currentDistributor.email_contacto = document.getElementById('drawerEmail').value;
    currentDistributor.fecha_ultimo_contacto = document.getElementById('drawerFechaContacto').value || null;
    currentDistributor.proxima_accion = document.getElementById('drawerProximaAccion').value;
    currentDistributor.fecha_proxima_accion = document.getElementById('drawerFechaProximaAccion').value || null;
    currentDistributor.notas_comerciales = document.getElementById('drawerNotas').value;

    markAsDirty();
    loadLocalData();
    closeDrawer();
}

function addLogEvento() {
    if (!currentDistributor) return;

    const evento = {
        fecha: new Date().toISOString(),
        tipo: document.getElementById('logTipo').value,
        resultado: document.getElementById('logResultado').value,
        notas: document.getElementById('logNotas').value
    };

    if (!currentDistributor.historial_contactos) currentDistributor.historial_contactos = [];
    currentDistributor.historial_contactos.unshift(evento);
    currentDistributor.fecha_ultimo_contacto = evento.fecha;

    markAsDirty();
    document.getElementById('logNotas').value = '';
    renderLogContactos();
    document.getElementById('drawerFechaContacto').value = formatDate(evento.fecha);
}

function renderLogContactos() {
    const container = document.getElementById('logContainer');
    const historial = currentDistributor?.historial_contactos || [];
    container.innerHTML = historial.length ? historial.map(e => `
        <div class="log-item">
            <div class="log-header">
                <span class="log-tipo">${e.tipo}</span>
                <span class="log-fecha">${formatDateTime(e.fecha)}</span>
            </div>
            <div class="log-resultado">${e.resultado}</div>
            <div class="log-notas">${e.notas || ''}</div>
        </div>
    `).join('') : '<p style="text-align:center;color:#999">Sin actividad</p>';
}

let dashFilters = { categoria: '', responsable: '', estado: '', provincia: '' };

function applyDashboardFilters() {
    let filtered = allData.filter(d => !d.inactivo);
    if (dashFilters.categoria) filtered = filtered.filter(d => d.categoria === dashFilters.categoria);
    if (dashFilters.responsable) filtered = filtered.filter(d => d.responsable_comercial === dashFilters.responsable);
    if (dashFilters.estado) filtered = filtered.filter(d => d.estado === dashFilters.estado);
    if (dashFilters.provincia) filtered = filtered.filter(d => d.provincia === dashFilters.provincia);
    updateDashboard(filtered);
}

function populateFilters() {
    const fields = {
        filterProvincia: 'provincia',
        filterCategoria: 'categoria',
        filterResponsable: 'responsable_comercial'
    };
    for (const [id, field] of Object.entries(fields)) {
        const select = document.getElementById(id);
        if (!select) continue;
        const values = [...new Set(allData.map(d => d[field]).filter(Boolean))].sort();
        const originalValue = select.value;
        select.innerHTML = `<option value="">Todos/as</option>` + values.map(v => `<option value="${v}">${v}</option>`).join('');
        select.value = originalValue;
    }
}

function populateDashboardFilters() {
    const fields = {
        dashFilterProvincia: 'provincia',
        dashFilterCategoria: 'categoria',
        dashFilterResponsable: 'responsable_comercial'
    };
    for (const [id, field] of Object.entries(fields)) {
        const select = document.getElementById(id);
        if (!select) continue;
        const values = [...new Set(allData.map(d => d[field]).filter(Boolean))].sort();
        select.innerHTML = `<option value="">Todas</option>` + values.map(v => `<option value="${v}">${v}</option>`).join('');
    }
}
