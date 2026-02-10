# CRM Distribuidores - Checa

Sistema de gestión comercial optimizado para distribuidores, con integración de IA para análisis de mercado y estrategias comerciales.

## 🚀 Configuración Inicial

Para que el proyecto funcione correctamente tras clonarlo:

### 1. Claves de API (IA)
El sistema requiere claves de **OpenAI** y **Serper.dev**.
1. Entra en la carpeta `apis/`.
2. Crea un archivo llamado `openai_key.txt` y pega tu clave de OpenAI.
3. Crea un archivo llamado `serper_key.txt` y pega tu clave de Serper.

### 2. Base de Datos
El sistema utiliza un archivo JSON local para persistir los datos.
1. Haz una copia del archivo `db.example.json` y renombralo a `db.json`.
2. Al abrir el CRM (`index.html`), selecciona este archivo `db.json` para empezar a trabajar.

### 3. Ejecución Local
Para la funcionalidad completa (lectura de archivos y APIs), abre el proyecto usando un servidor local:
- Usando el archivo `INICIAR_CRM.bat` (si estás en Windows).
- O usando una extensión de VS Code como "Live Server".

## 📱 Uso en Celular
Consulta la guía detallada de acceso móvil en los documentos del proyecto para configurar el acceso vía red local o hosting.
