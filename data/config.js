/**
 * CONFIGURACIÓN DEL CRM - PLANTILLA
 * Modificá este archivo para crear una nueva instancia del CRM para otra empresa.
 */

const CRM_CONFIG = {
    // Nombre de la empresa o instancia
    BRAND_NAME: "Checa Bar - Convenios Con Empresas",

    // Nombre de la colección en Firestore (Base de Datos)
    COLLECTION_NAME: "empresas",

    // Nombre del archivo local en carpeta data/ para migración inicial (JSON o Excel)
    DB_FILE: "Checabar_db.json",

    // Configuración de Firebase
    FIREBASE: {
        apiKey: "AIzaSyAWmFfxCGCEPhBn-I9MHsBrR1AWe1y2hqU",
        authDomain: "checabar-crm-empresas.firebaseapp.com",
        projectId: "checabar-crm-empresas",
        storageBucket: "checabar-crm-empresas.firebasestorage.app",
        messagingSenderId: "548624675493",
        appId: "1:548624675493:web:7feb3d8b8789d2621a534c"
    }
};
