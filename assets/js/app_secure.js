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

// La colección se define ahora en data/config.js para permitir "multiplicar" la app por carpeta
const CURRENT_COLLECTION = CRM_CONFIG.COLLECTION_NAME;

// Lista fija de responsables comerciales
const RESPONSABLES = ['Milton', 'Juan Cruz'];

// ============================================
// INICIALIZACIÓN (FIREBASE)
// ============================================

let firestoreUnsubscribe = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Iniciando CRM Distribuidores v105...');

    try {
        setupEventListeners();

        // Si Cloud está activo, el sync lo dispara auth_local.js al hacer login.
        // Si no, arrancar modo local buscando el archivo de data/
        if (!window.CRM_IS_CLOUD_ACTIVE) {
            console.log('📂 Arrancando en Modo Local (Cloud desactivado)...');
            checkLocalFileForMigration();
        } else {
            console.log('☁️ Cloud activo, esperando login local para sincronizar...');
        }

        window.addEventListener('beforeunload', (e) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '¡Tenés cambios sin guardar!';
            }
        });

    } catch (error) {
        console.error('❌ Error en inicialización:', error);
    }
});

function startRealtimeSync() {
    if (firestoreUnsubscribe) firestoreUnsubscribe();

    // Actualizar indicador de estado
    const apiStatus = document.getElementById('apiStatus');
    if (apiStatus) {
        apiStatus.innerHTML = '☁️ Firebase Conectado';
        apiStatus.classList.add('active');
    }

    firestoreUnsubscribe = db.collection(CURRENT_COLLECTION).onSnapshot((snapshot) => {
        const cloudData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log(`📥 Sincronización: ${cloudData.length} registros en la nube.`);

        // Bloqueo de sobreescritura si tenemos datos locales pendientes de subir
        if (isDirty && cloudData.length === 0) {
            console.log('⚠️ Ignorando base vacía de la nube porque hay datos locales cargados.');
            return;
        }

        allData = cloudData;

        // Si la base está vacía en la nube, mostramos el Welcome Screen
        if (allData.length === 0 && !baseLoaded) {
            checkLocalFileForMigration().then(found => {
                if (!found) showWelcomeScreen();
            });
        } else if (allData.length > 0) {
            baseLoaded = true;
            onBaseLoaded();
        }
    }, (error) => {
        console.error('❌ Error de sincronización Firestore:', error);
        alert('Error al conectar con la base de datos en tiempo real.');
    });
}

/**
 * Muestra la pantalla de bienvenida con opciones de carga inicial
 * @param {string} state - 'initial', 'ready_to_sync', o 'loading'
 */
function showWelcomeScreen(state = 'initial', params = {}) {
    const welcome = document.getElementById('welcomeScreen');
    if (!welcome) return;

    welcome.style.display = 'flex';
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('headerActions').style.display = 'none';

    const isCloud = window.CRM_IS_CLOUD_ACTIVE;

    if (state === 'loading') {
        welcome.innerHTML = `
            <div class="welcome-content">
                <div style="font-size: 3rem; margin-bottom: 1.5rem; animation: spin 2s linear infinite;">⏳</div>
                <h2>Conectando...</h2>
                <p style="color: rgba(255,255,255,0.6);">Sincronizando con la nube</p>
            </div>
        `;
    } else if (state === 'initial') {
        welcome.innerHTML = `
            <div class="welcome-content">
                <h2>Base de Datos No Cargada</h2>
                <p style="margin-bottom: 1.5rem; color: rgba(255,255,255,0.7);">
                    ${isCloud ? 'La base en la nube está vacía.' : 'El sistema está en modo Local.'} 
                    Seleccioná tu archivo local (JSON o Excel) para empezar.
                </p>
                <button onclick="loadDatabase()" class="btn btn-primary welcome-btn">📂 Cargar archivo de datos</button>
            </div>
        `;
    } else if (state === 'ready_to_migrate_local') {
        const { fileName, blob } = params;
        welcome.innerHTML = `
            <div class="welcome-content" style="border: 2px solid var(--accent-primary);">
                <h2 style="color: var(--accent-primary);">📂 Base Local Detectada</h2>
                <p style="margin-bottom: 0.5rem; color: white;">
                    Se encontró el archivo <strong>${fileName}</strong> en la carpeta data.
                </p>
                <p style="margin-bottom: 1.5rem; color: rgba(255,255,255,0.7); font-size: 0.9rem;">
                    ¿Querés usarlo para iniciar el CRM de <strong>${CRM_CONFIG.BRAND_NAME}</strong>?
                </p>
                <div style="display: flex; gap: 1rem; flex-direction: column;">
                    <button id="btnMigrateLocal" class="btn btn-primary welcome-btn" style="padding: 1.25rem;">
                        ${isCloud ? '🚀 Importar y Migrar a la Nube' : '💻 Empezar a trabajar (Modo Local)'}
                    </button>
                    <button onclick="showWelcomeScreen('initial')" class="btn btn-link" style="color: #94a3b8; font-size: 0.8rem;">
                        No, prefiero cargar otro archivo...
                    </button>
                </div>
            </div>
        `;
        document.getElementById('btnMigrateLocal').onclick = async () => {
            try {
                const btn = document.getElementById('btnMigrateLocal');
                btn.disabled = true;
                btn.innerText = '⌛ Procesando Archivo...';

                let dataItems = [];
                if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                    dataItems = await parseExcel(blob);
                } else {
                    const text = await blob.text();
                    const jsonObj = JSON.parse(text);
                    dataItems = jsonObj.items || jsonObj;
                }

                allData = dataItems;

                if (isCloud) {
                    isDirty = true; // Pendiente de subir a Firebase
                    showWelcomeScreen('ready_to_sync');
                } else {
                    // Modo Local: Entrar directo
                    baseLoaded = true;
                    onBaseLoaded();
                }
            } catch (err) {
                alert('Error al procesar el archivo: ' + err.message);
                showWelcomeScreen('initial');
            }
        };
    } else if (state === 'ready_to_sync') {
        welcome.innerHTML = `
            <div class="welcome-content" style="border: 2px solid var(--accent-success);">
                <h2 style="color: var(--accent-success);">✅ Datos Cargados</h2>
                <p style="margin-bottom: 0.5rem; color: white; font-weight: bold;">
                    Se detectaron ${allData.length} registros.
                </p>
                <p style="margin-bottom: 1.5rem; color: rgba(255,255,255,0.7); font-size: 0.9rem;">
                    ${isCloud ? 'Paso 2: Presioná el botón de abajo para sincronizar con la nube.' : 'Podés empezar a trabajar en modo local.'}
                </p>
                <div style="display: flex; gap: 1rem; flex-direction: column;">
                    ${isCloud ? `
                    <button id="btnSyncWelcome" onclick="saveDatabase()" class="btn btn-success welcome-btn" style="padding: 1.25rem;">
                        ☁️ Sincronizar todos los datos con Firebase
                    </button>
                    ` : `
                    <button onclick="onBaseLoaded()" class="btn btn-success welcome-btn" style="padding: 1.25rem;">
                        👉 Ingresar al Dashboard
                    </button>
                    `}
                    <button onclick="loadDatabase()" class="btn btn-link" style="color: #94a3b8; font-size: 0.8rem;">
                        Cambiar de archivo...
                    </button>
                </div>
            </div>
        `;
    }
}

/**
 * Detecta y carga un archivo local automáticamente si está configurado
 */
async function checkLocalFileForMigration() {
    if (!CRM_CONFIG.DB_FILE) return false;

    try {
        const fetchUrl = `data/${CRM_CONFIG.DB_FILE}?v=${Date.now()}`;
        console.log(`📡 Intentando cargar base desde: ${fetchUrl}`);

        const response = await fetch(fetchUrl);
        if (!response.ok) {
            console.warn(`⚠️ No se pudo cargar el archivo local (${response.status}): ${fetchUrl}`);
            return false;
        }

        const blob = await response.blob();
        console.log(`📂 Archivo local cargado con éxito: ${CRM_CONFIG.DB_FILE} (${blob.size} bytes)`);

        // Modo Local: Cargar y procesar automáticamente
        if (!window.CRM_IS_CLOUD_ACTIVE) {
            console.log('🤖 Auto-procesando base local...');
            let dataItems = [];
            if (CRM_CONFIG.DB_FILE.endsWith('.xlsx') || CRM_CONFIG.DB_FILE.endsWith('.xls')) {
                dataItems = await parseExcel(blob);
            } else {
                const text = await blob.text();
                const jsonObj = JSON.parse(text);
                dataItems = jsonObj.items || jsonObj;
            }

            allData = dataItems;
            baseLoaded = true;
            console.log(`✅ Base local cargada: ${allData.length} registros.`);

            // Si el usuario ya está dentro (o acabamos de desbloquear), renderizar
            if (!document.body.classList.contains('not-logged-in')) {
                onBaseLoaded();
            }
            return true;
        }

        // Modo Cloud: Comportamiento original (ofrecer migración)
        showWelcomeScreen('ready_to_migrate_local', {
            fileName: CRM_CONFIG.DB_FILE,
            blob: blob
        });
        return true;
    } catch (e) {
        console.error('❌ Error en checkLocalFileForMigration:', e);
        return false;
    }
}

/**
 * Procesa un archivo Excel y devuelve el array de items
 */
async function parseExcel(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(firstSheet);

                // Normalizar campos para empresas
                const items = rows.map((row, index) => ({
                    ...row,
                    id: row.id || row.ID || `emp_${Date.now()}_${index}`,
                    nombre: row.nombre || row.Nombre || row.NOMBRE || 'Sin Nombre',
                    categoria: row.categoria || row.Categoria || row['Categoria'] || '',
                    direccion: row.direccion || row.Direccion || row['Direccion'] || '',
                    barrio: row.barrio || row.Barrio || row['Barrio'] || '',
                    telefono_empresa: row.telefono_empresa || row.Telefono || row['Telefono'] || '',
                    cantidad_empleados: row.cantidad_empleados || row['Cantidad de empleados'] || '',
                    link_google: row.link_google || row['Link de Google'] || row['Link_Google'] || '',
                    link_busqueda_empleados: row.link_busqueda_empleados || row['Link busqueda empleados'] || row['Link_busqueda_empleados'] || '',
                    estado: row.estado || row.Estado || 'pendiente',
                    etapa_pipeline: row.etapa_pipeline || 'nuevo'
                }));

                resolve(items);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
    });
}

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

            document.getElementById('lastUpdate').textContent = `Última actualización: ${lastMod} `;

            baseLoaded = true;
            isDirty = true;

            if (window.CRM_IS_CLOUD_ACTIVE) {
                // Si Firestore está activo, verificamos si está vacío para el Paso 2 (Migración)
                const snapshot = await db.collection(CURRENT_COLLECTION).limit(1).get();
                if (snapshot.empty) {
                    showWelcomeScreen('ready_to_sync');
                    console.log(`✅ Base cargada para migración: ${allData.length} registros.`);
                } else {
                    onBaseLoaded();
                    console.log(`✅ Base cargada: ${allData.length} registros desde "${handle.name}"`);
                }
            } else {
                // Modo Local: Entrar directo
                onBaseLoaded();
                console.log(`✅ Base cargada (Modo Local): ${allData.length} registros.`);
            }
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

            document.getElementById('lastUpdate').textContent = `Última actualización: ${lastMod} `;

            baseLoaded = true;
            isDirty = true;

            if (window.CRM_IS_CLOUD_ACTIVE) {
                const snapshot = await db.collection(CURRENT_COLLECTION).limit(1).get();
                if (snapshot.empty) {
                    showWelcomeScreen('ready_to_sync');
                } else {
                    onBaseLoaded();
                }
            } else {
                // En modo local, siempre entramos al dashboard tras cargar por éxito
                onBaseLoaded();
            }
        } catch (error) {
            alert('❌ Error al cargar: ' + error.message);
        }

        input.value = '';
    };
    input.click();
}

// ============================================
// GUARDAR / MIGRAR A FIREBASE
// ============================================

async function saveDatabase() {
    if (allData.length === 0) return;

    if (!window.CRM_IS_CLOUD_ACTIVE) {
        alert('ℹ️ Modo Local Activo.\n\nLos cambios que hagas se guardan en la memoria de la pestaña pero no se sincronizan con Firebase hasta que configures las credenciales en data/config.js.');
        return;
    }

    const count = allData.length;
    if (confirm(`¿Querés subir ${count} registros a Firebase ? Esto sincronizará todos los datos en la nube.`)) {

        // Buscar botones tanto en Header como en Welcome Screen
        const btns = [
            document.getElementById('btnSaveDB'),
            document.getElementById('btnSyncWelcome')
        ].filter(Boolean);

        btns.forEach(b => {
            b.disabled = true;
            b._originalText = b.innerHTML;
            b.innerHTML = '⏳ Subiendo...';
        });

        try {
            // Firestore tiene un límite de 500 escrituras por batch.
            // Dividimos allData en trozos (chunks) de 400.
            const chunkSize = 400;
            const chunks = [];
            for (let i = 0; i < allData.length; i += chunkSize) {
                chunks.push(allData.slice(i, i + chunkSize));
            }

            console.log(`🚀 Iniciando subida de ${count} registros en ${chunks.length} lotes...`);

            for (let i = 0; i < chunks.length; i++) {
                const batch = db.batch();
                chunks[i].forEach(item => {
                    if (!item.id) {
                        item.id = generateID(item.nombre, item.barrio || item['Barrio'] || '', item.categoria || '');
                    }
                    const docRef = db.collection(CURRENT_COLLECTION).doc(item.id);
                    batch.set(docRef, item, { merge: true });
                });

                await batch.commit();
                console.log(`✅ Lote ${i + 1}/${chunks.length} completado.`);
            }

            alert('✅ Sincronización completa con Firebase. Los datos ya están seguros en la nube.');
            isDirty = false;
            baseLoaded = true;
            onBaseLoaded(); // Ahora sí, entramos al CRM

        } catch (error) {
            console.error('Error migrando:', error);
            alert('❌ Error al subir datos: ' + error.message + '\n\nPor favor, verificá tu conexión.');
        } finally {
            btns.forEach(b => {
                b.disabled = false;
                b.innerHTML = b._originalText;
            });
        }
    }
}

// ============================================
// TRANSICIONES DE PANTALLA
// ============================================

function onBaseLoaded() {
    // Si no hay datos todavía (pero estamos en modo local), esperar o avisar
    if (allData.length === 0 && !window.CRM_IS_CLOUD_ACTIVE && !baseLoaded) {
        console.log('⏳ onBaseLoaded: Esperando que termine la carga del archivo local...');
        return;
    }

    // Ocultar welcome, mostrar contenido y header actions
    const welcome = document.getElementById('welcomeScreen');
    const main = document.getElementById('mainContent');
    const header = document.getElementById('headerActions');

    if (welcome) welcome.style.display = 'none';
    if (main) main.style.display = 'block';
    if (header) header.style.display = 'flex';

    updateStatus('loaded');
    updateCollectionUI();
    loadLocalData();
}

/**
 * Actualiza info básica de la base en la UI
 */
function updateCollectionUI() {
    const badge = document.getElementById('activeCollectionNameHeader') || document.getElementById('activeCollectionName');
    const apiStatus = document.getElementById('apiStatus');

    if (badge) {
        badge.innerText = CURRENT_COLLECTION;
        badge.parentElement.style.display = 'block';
    }

    if (apiStatus) {
        if (window.CRM_IS_CLOUD_ACTIVE) {
            apiStatus.innerHTML = '☁️ Nube Conectada';
            apiStatus.classList.add('active');
            apiStatus.style.background = 'rgba(74, 222, 128, 0.1)';
            apiStatus.style.color = '#4ade80';
        } else {
            apiStatus.innerHTML = '💻 Modo Local (Sin Nube)';
            apiStatus.classList.remove('active');
            apiStatus.style.background = 'rgba(255, 255, 255, 0.05)';
            apiStatus.style.color = '#94a3b8';
        }
    }
}

// Ya no se usa switchCollection dinámico
// Recargar para reiniciar todo con la nueva colección

// Ya no se usa createNewCollection dinámico

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
    try {
        const updateData = { [field]: value };
        if (field === 'estado' && value === 'contactado') {
            updateData.fecha_ultimo_contacto = new Date().toISOString();
        }
        await db.collection(CURRENT_COLLECTION).doc(id).update(updateData);
        console.log(`✅ Campo ${field} actualizado en Firebase para ${id}`);
    } catch (error) {
        console.error('Error actualizando campo:', error);
    }
}

// ============================================
// UTILIDADES
// ============================================

function generateID(nombre, barrio, extra) {
    const normalize = (str) => (str || '').toString().toLowerCase().trim().replace(/\s+/g, '');
    const combined = normalize(nombre) + normalize(barrio) + normalize(extra);
    return 'emp_' + Math.abs(simpleHash(combined)).toString(36);
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
            <td>${dist.barrio || dist['Barrio'] || ''}</td>
            <td>${dist.categoria || ''}</td>
            <td>${dist.cantidad_empleados || dist['Cantidad de empleados'] || '-'}</td>
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
                <button class="btn-icon" onclick="openGoogle(this)" data-link="${dist.link_google || dist['Link de Google'] || ''}" title="Ver en Google Maps">🗺️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function openGoogle(btnOrLink) {
    const link = (typeof btnOrLink === 'string') ? btnOrLink : btnOrLink.dataset.link;
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
    ['filterBarrio', 'filterCategoria', 'filterEstado', 'filterResponsable'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', applyFilters);
    });
    document.getElementById('btnClearFilters')?.addEventListener('click', () => {
        ['filterNombre', 'filterBarrio', 'filterCategoria', 'filterEstado', 'filterResponsable'].forEach(id => {
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
    ['dashFilterCategoria', 'dashFilterResponsable', 'dashFilterEstado', 'dashFilterBarrio'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', (e) => {
            const field = id.replace('dashFilter', '').toLowerCase();
            dashFilters[field] = e.target.value;
            applyDashboardFilters();
        });
    });

    document.getElementById('btnClearDashFilters')?.addEventListener('click', () => {
        dashFilters = { categoria: '', responsable: '', estado: '', barrio: '' };
        ['dashFilterCategoria', 'dashFilterResponsable', 'dashFilterEstado', 'dashFilterBarrio'].forEach(id => {
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
        barrio: document.getElementById('filterBarrio')?.value || '',
        categoria: document.getElementById('filterCategoria')?.value || '',
        estado: document.getElementById('filterEstado')?.value || '',
        responsable: document.getElementById('filterResponsable')?.value || ''
    };

    filteredData = allData.filter(d => {
        if (d.inactivo) return false;
        const nombre = (d.nombre || '').toLowerCase();
        const direccion = (d.direccion || d['Direccion'] || '').toLowerCase();
        if (filters.nombre && !nombre.includes(filters.nombre) && !direccion.includes(filters.nombre)) return false;
        const barrio = d.barrio || d['Barrio'] || '';
        if (filters.barrio && barrio !== filters.barrio) return false;
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

    // Datos de la empresa (solo lectura)
    document.getElementById('drawerDireccion').value = dist.direccion || dist['Direccion'] || '';
    document.getElementById('drawerBarrio').value = dist.barrio || dist['Barrio'] || '';
    document.getElementById('drawerTelefonoEmpresa').value = dist.telefono_empresa || dist['Telefono'] || '';
    document.getElementById('drawerEmpleados').value = dist.cantidad_empleados || dist['Cantidad de empleados'] || '';

    // Botones de links
    const linkMaps = dist.link_google || dist['Link de Google'] || '';
    const linkBusqueda = dist.link_busqueda_empleados || dist['Link busqueda empleados'] || '';
    document.getElementById('btnVerMaps').onclick = () => linkMaps ? window.open(linkMaps, '_blank') : alert('Sin link de Google Maps');
    document.getElementById('btnBuscarEmpleados').onclick = () => linkBusqueda ? window.open(linkBusqueda, '_blank') : alert('Sin link de búsqueda');

    // Campos CRM editables
    document.getElementById('drawerEstado').value = dist.estado || 'pendiente';
    document.getElementById('drawerEtapa').value = dist.etapa_pipeline || 'nuevo';
    document.getElementById('drawerProbabilidad').value = dist.probabilidad || 0;
    document.getElementById('drawerResponsable').value = dist.responsable_comercial || '';
    document.getElementById('drawerNombreContacto').value = dist.nombre_contacto || '';
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

    const updatedData = {
        estado: document.getElementById('drawerEstado').value,
        etapa_pipeline: document.getElementById('drawerEtapa').value,
        probabilidad: parseInt(document.getElementById('drawerProbabilidad').value) || 0,
        responsable_comercial: document.getElementById('drawerResponsable').value,
        nombre_contacto: document.getElementById('drawerNombreContacto').value,
        email_contacto: document.getElementById('drawerEmail').value,
        fecha_ultimo_contacto: document.getElementById('drawerFechaContacto').value || null,
        proxima_accion: document.getElementById('drawerProximaAccion').value,
        fecha_proxima_accion: document.getElementById('drawerFechaProximaAccion').value || null,
        notas_comerciales: document.getElementById('drawerNotas').value
    };

    try {
        await db.collection(CURRENT_COLLECTION).doc(currentDistributor.id).update(updatedData);
        console.log('✅ Cambios guardados en Firebase');
        closeDrawer();
    } catch (error) {
        console.error('Error guardando drawer:', error);
        alert('Error al guardar los cambios.');
    }
}

async function addLogEvento() {
    if (!currentDistributor) return;

    const evento = {
        fecha: new Date().toISOString(),
        tipo: document.getElementById('logTipo').value,
        resultado: document.getElementById('logResultado').value,
        notas: document.getElementById('logNotas').value
    };

    try {
        const docRef = db.collection(CURRENT_COLLECTION).doc(currentDistributor.id);
        await docRef.update({
            historial_contactos: firebase.firestore.FieldValue.arrayUnion(evento),
            fecha_ultimo_contacto: evento.fecha,
            estado: 'contactado' // Al agregar evento, asumimos contactado
        });

        document.getElementById('logNotas').value = '';
        console.log('✅ Evento agregado a Firebase');
    } catch (error) {
        console.error('Error agregando evento:', error);
        alert('Error al guardar el evento.');
    }
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

let dashFilters = { categoria: '', responsable: '', estado: '', barrio: '' };

function applyDashboardFilters() {
    let filtered = allData.filter(d => !d.inactivo);
    if (dashFilters.categoria) filtered = filtered.filter(d => d.categoria === dashFilters.categoria);
    if (dashFilters.responsable) filtered = filtered.filter(d => d.responsable_comercial === dashFilters.responsable);
    if (dashFilters.estado) filtered = filtered.filter(d => d.estado === dashFilters.estado);
    if (dashFilters.barrio) filtered = filtered.filter(d => (d.barrio || d['Barrio'] || '') === dashFilters.barrio);
    updateDashboard(filtered);
}

function populateFilters() {
    const fields = {
        filterBarrio: d => d.barrio || d['Barrio'] || '',
        filterCategoria: d => d.categoria || '',
        filterResponsable: d => d.responsable_comercial || ''
    };
    for (const [id, getter] of Object.entries(fields)) {
        const select = document.getElementById(id);
        if (!select) continue;
        const values = [...new Set(allData.map(getter).filter(Boolean))].sort();
        const originalValue = select.value;
        select.innerHTML = `<option value="">Todos/as</option>` + values.map(v => `<option value="${v}">${v}</option>`).join('');
        select.value = originalValue;
    }
}

function populateDashboardFilters() {
    const fields = {
        dashFilterBarrio: d => d.barrio || d['Barrio'] || '',
        dashFilterCategoria: d => d.categoria || '',
        dashFilterResponsable: d => d.responsable_comercial || ''
    };
    for (const [id, getter] of Object.entries(fields)) {
        const select = document.getElementById(id);
        if (!select) continue;
        const values = [...new Set(allData.map(getter).filter(Boolean))].sort();
        select.innerHTML = `<option value="">Todas</option>` + values.map(v => `<option value="${v}">${v}</option>`).join('');
    }
}
