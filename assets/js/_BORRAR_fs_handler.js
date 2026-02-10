/**
 * fs_handler.js
 * Utilidades para interactuar con la File System Access API y persistencia de handle.
 */

const FS_DB_NAME = 'FS_Handle_DB';
const FS_STORE_NAME = 'handles';
const FILE_KEY = 'db_json_handle';

/**
 * Inicializa la base de datos para guardar el fileHandle.
 */
function initFSDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(FS_DB_NAME, 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(FS_STORE_NAME)) {
                db.createObjectStore(FS_STORE_NAME);
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

/**
 * Guarda el handle del archivo en IndexedDB.
 */
async function saveFileHandle(handle) {
    const db = await initFSDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(FS_STORE_NAME, 'readwrite');
        tx.objectStore(FS_STORE_NAME).put(handle, FILE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/**
 * Recupera el handle del archivo desde IndexedDB.
 */
async function getSavedFileHandle() {
    const db = await initFSDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(FS_STORE_NAME, 'readonly');
        const req = tx.objectStore(FS_STORE_NAME).get(FILE_KEY);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

/**
 * Verifica si tenemos permisos de lectura/escritura.
 */
async function verifyPermission(handle, readWrite = true) {
    const options = {};
    if (readWrite) options.mode = 'readwrite';
    
    // Verifica si ya tenemos el permiso
    if ((await handle.queryPermission(options)) === 'granted') {
        return true;
    }
    
    // Solicita permiso al usuario
    if ((await handle.requestPermission(options)) === 'granted') {
        return true;
    }
    
    return false;
}

/**
 * Abre el selector de archivos para elegir db.json.
 */
async function selectFile() {
    try {
        const [handle] = await window.showOpenFilePicker({
            types: [
                {
                    description: 'JSON Database',
                    accept: { 'application/json': ['.json'] },
                },
            ],
            multiple: false
        });
        await saveFileHandle(handle);
        return handle;
    } catch (e) {
        if (e.name !== 'AbortError') {
            console.error('Error seleccionando archivo:', e);
        }
        return null;
    }
}

/**
 * Lee el contenido del archivo.
 */
async function readFileContent(handle) {
    const file = await handle.getFile();
    const content = await file.text();
    return {
        data: JSON.parse(content),
        lastModified: file.lastModified
    };
}

/**
 * Sobrescribe el archivo.
 */
async function writeFileContent(handle, content) {
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(content, null, 2));
    await writable.close();
}

/**
 * Verifica si la API está disponible.
 */
function isFSApiSupported() {
    return 'showOpenFilePicker' in window;
}
