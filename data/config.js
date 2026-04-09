/**
 * CONFIGURACIÓN DEL CRM - PLANTILLA
 * Modificá este archivo para crear una nueva instancia del CRM para otra empresa.
 */

const CRM_CONFIG = {
    // Nombre de la empresa o instancia
    BRAND_NAME: "Checa Bar - Convenios Con Empresas",

    // Nombre de la colección en Firestore (Base de Datos)
    COLLECTION_NAME: "",

    // Nombre del archivo local en carpeta data/ para migración inicial (JSON o Excel)
    DB_FILE: "Checabar_db.xlsx",

    // Configuración de Firebase - Dejar vacío para "Modo Local" inicial
    FIREBASE: {
        projectId: "",
        appId: "",
        storageBucket: "",
        apiKey: "",
        authDomain: "",
        messagingSenderId: ""
    }
};
