// ============================================
// CONFIGURACIÓN Y CONSTANTES
// ============================================

const DB_NAME = 'CRM_Distribuidores_DB';
const DB_VERSION = 1;
const STORE_NAME = 'distribuidores';
const CONFIG_STORE = 'config';

let db = null;
let currentDistributor = null;
let allData = [];
let filteredData = [];
let cachedApiKey = null;

// File System State
let fileHandle = null;
let lastKnownFileMod = null;
let isDirty = false;

// ✅ 1) Inyección desde BAT/HTML
if (window.CHECA_OPENAI_KEY) {
    cachedApiKey = window.CHECA_OPENAI_KEY;
}

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Iniciando CRM...');

    try {
        await initDB();
        await loadApiKeyFromFile();

        // Cargar datos locales de seguridad (IndexedDB sigue siendo caché rápida)
        await loadLocalData();

        setupEventListeners();
        setupFSListeners();

        // Intentar autoconectar base.json
        if (isFSApiSupported()) {
            await autoConnectDB();
        } else {
            alert('⚠️ Tu navegador no soporta File System Access API. Usá el botón "Exportar JSON" para respaldos manuales.');
        }

        updateUI();
        console.log('✅ CRM listo!');
    } catch (error) {
        console.error('❌ Error en inicialización:', error);
    }
});

// ============================================
// FILE SYSTEM ACTIONS
// ============================================

async function autoConnectDB() {
    try {
        const savedHandle = await getSavedFileHandle();
        if (savedHandle) {
            console.log('🔄 Reconectando base.json...');
            if (await verifyPermission(savedHandle, true)) {
                fileHandle = savedHandle;
                await reloadFromDisk();
                updateFSStatus('connected');
            } else {
                console.warn('⚠️ Permiso denegado para reconectar automáticamente');
                updateFSStatus('disconnected');
            }
        }
    } catch (e) {
        console.error('Error en autoconexión:', e);
    }
}

async function connectNewDB() {
    const handle = await selectFile();
    if (handle) {
        if (await verifyPermission(handle, true)) {
            fileHandle = handle;
            await reloadFromDisk();
            updateFSStatus('connected');
            alert('✅ Base conectada con éxito');
        }
    }
}

async function reloadFromDisk() {
    if (!fileHandle) return;
    try {
        const { data, lastModified } = await readFileContent(fileHandle);
        allData = data.items || [];
        lastKnownFileMod = lastModified;

        // Guardar metadata del archivo si existe
        if (data.meta && data.meta.updated_at) {
            await saveConfig('lastUpdate', data.meta.updated_at);
        }

        // Actualizar caché local
        await clearDatabase();
        await saveToIndexedDB(allData);

        isDirty = false;
        updateFSStatus('connected');
        await loadLocalData();
    } catch (e) {
        console.error('Error cargando desde disco:', e);
        alert('❌ Error al leer el archivo JSON');
    }
}

async function saveToDisk() {
    if (!fileHandle) return;

    try {
        // 1. Verificar concurrencia
        const file = await fileHandle.getFile();
        if (lastKnownFileMod && file.lastModified > lastKnownFileMod) {
            const choice = confirm('⚠️ ¡CONCURRENCIA! El archivo en disco es más nuevo que tu versión.\n\n¿Querés sobrescribir igual (perdiendo cambios externos)?\n\nCancelar para "Exportar mi versión" y resolver manualmente.');
            if (!choice) {
                exportCurrentJSON();
                return;
            }
        }

        // 2. Preparar payload
        const payload = {
            meta: {
                updated_at: new Date().toISOString(),
                updated_by: 'CRM User',
                schema: 'CHECA_CRM_DB_V1'
            },
            items: allData
        };

        // 3. Escribir
        await writeFileContent(fileHandle, payload);

        // 4. Actualizar estado
        const newFile = await fileHandle.getFile();
        lastKnownFileMod = newFile.lastModified;
        isDirty = false;

        updateFSStatus('connected');
        alert('✅ Cambios guardados físicamente en ' + fileHandle.name);
    } catch (e) {
        console.error('Error guardando en disco:', e);
        alert('❌ Error al guardar: ' + e.message);
    }
}

function updateFSStatus(status) {
    const indicator = document.getElementById('fsIndicator');
    const dot = document.getElementById('fsStatusDot');
    const text = document.getElementById('fsStatusText');
    const btnSave = document.getElementById('btnSaveDB');
    const btnReload = document.getElementById('btnReloadDB');

    if (!indicator) return;

    indicator.style.display = 'flex';
    dot.className = 'status-dot';

    if (status === 'connected') {
        dot.classList.add('connected');
        text.textContent = fileHandle ? fileHandle.name : 'Conectado';
        btnSave.style.display = 'inline-block';
        btnReload.style.display = 'inline-block';
    } else if (status === 'dirty') {
        dot.classList.add('dirty');
        text.textContent = 'Cambios sin guardar';
        btnSave.style.display = 'inline-block';
        btnReload.style.display = 'inline-block';
    } else {
        text.textContent = 'Desconectado';
        btnSave.style.display = 'none';
        btnReload.style.display = 'none';
    }
}

function markAsDirty() {
    isDirty = true;
    updateFSStatus('dirty');
}

function exportCurrentJSON() {
    const payload = {
        meta: {
            updated_at: new Date().toISOString(),
            updated_by: 'CRM User Export',
            schema: 'CHECA_CRM_DB_V1'
        },
        items: allData
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crm_db_export_${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// ============================================
// IndexedDB
// ============================================

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => { db = request.result; resolve(); };
        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains(CONFIG_STORE)) {
                database.createObjectStore(CONFIG_STORE, { keyPath: 'key' });
            }
        };
    });
}

async function saveToIndexedDB(data) {
    if (!db) return;
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        data.forEach(item => store.put(item));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

async function loadFromIndexedDB() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function saveConfig(key, value) {
    const transaction = db.transaction([CONFIG_STORE], 'readwrite');
    transaction.objectStore(CONFIG_STORE).put({ key, value });
}

async function loadConfig(key) {
    return new Promise((resolve) => {
        const transaction = db.transaction([CONFIG_STORE], 'readonly');
        const request = transaction.objectStore(CONFIG_STORE).get(key);
        request.onsuccess = () => resolve(request.result?.value);
        request.onerror = () => resolve(null);
    });
}

async function clearDatabase() {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    transaction.objectStore(STORE_NAME).clear();
    return new Promise(r => transaction.oncomplete = r);
}

// ============================================
// CORE DATA LOGIC
// ============================================

async function loadLocalData() {
    allData = await loadFromIndexedDB();
    filteredData = allData.filter(d => !d.inactivo);

    // UI Updates
    const lastUpdate = await loadConfig('lastUpdate');
    if (lastUpdate) {
        document.getElementById('lastUpdate').textContent =
            `Última actualización: ${new Date(lastUpdate).toLocaleString('es-AR')}`;
    }

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

    await saveToIndexedDB([item]);
    markAsDirty();
    updateDashboard();
}

// ============================================
// UTILIDADES (igual)
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
// UI - RENDER (REUSADO)
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
        row.innerHTML = `
            <td><strong>${dist.nombre}</strong></td>
            <td>${dist.provincia}</td>
            <td>${dist.ciudad}</td>
            <td>${dist.puntaje || 0}</td>
            <td>${dist.categoria}</td>
            <td>
                <select onchange="updateField('${dist.id}', 'estado', this.value)">
                    <option value="pendiente" ${dist.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                    <option value="contactado" ${dist.estado === 'contactado' ? 'selected' : ''}>Contactado</option>
                </select>
            </td>
            <td>
                <input type="text" value="${dist.responsable_comercial || ''}" 
                       onchange="updateField('${dist.id}', 'responsable_comercial', this.value)"
                       placeholder="Asignar...">
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

// (Otras funciones de UI Dashboard simplificadas para brevedad del bloque pero manteniendo funcionalidad)
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

function setupFSListeners() {
    document.getElementById('btnConnectDB')?.addEventListener('click', connectNewDB);
    document.getElementById('btnSaveDB')?.addEventListener('click', saveToDisk);
    document.getElementById('btnReloadDB')?.addEventListener('click', async () => {
        if (confirm('🔄 ¿Recargar desde disco? Perderás cambios no guardados en memoria.')) {
            await reloadFromDisk();
        }
    });
    document.getElementById('btnExportJSON')?.addEventListener('click', exportCurrentJSON);
}

function setupEventListeners() {
    // Filtros
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

    // Drawer Actions
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
// DRAWER LOGIC
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

async function saveDrawer() {
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

    await saveToIndexedDB([currentDistributor]);
    markAsDirty();
    await loadLocalData();
    closeDrawer();
}

async function addLogEvento() {
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

    await saveToIndexedDB([currentDistributor]);
    markAsDirty();
    document.getElementById('logNotas').value = '';
    renderLogContactos();
    document.getElementById('drawerFechaContacto').value = formatDate(evento.fecha);
}

function renderLogContactos() {
    const container = document.getElementById('logContainer');
    const historial = currentDistributor.historial_contactos || [];
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

// ============================================
// API KEY & MISC
// ============================================

async function loadApiKeyFromFile() {
    try {
        const response = await fetch('openai_key.txt');
        if (response.ok) {
            cachedApiKey = (await response.text()).trim();
            const statusDiv = document.getElementById('apiStatus');
            if (statusDiv) {
                statusDiv.textContent = '🤖 Modo IA Activado';
                statusDiv.className = 'api-status active';
            }
        }
    } catch { }
}

// Helper filters global
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
    // Implementación resumida pero funcional para poblar los selectores dinámicamente
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

function updateUI() { /* Placeholder */ }
