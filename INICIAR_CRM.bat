@echo off
chcp 65001 >nul 2>&1
cd /d "%~dp0"

:: ========================================
:: LOG SETUP
:: ========================================
if not exist "logs" mkdir "logs"
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value 2^>nul') do set "DT=%%I"
if not defined DT set "DT=unknown"
set "LOGFILE=logs\startup_%DT:~0,8%_%DT:~8,6%.log"
echo. > "%LOGFILE%"

echo.
echo  ========================================
echo    CRM DISTRIBUIDORES - CHECA
echo  ========================================
echo.

echo [%date% %time%] ======================================== >> "%LOGFILE%"
echo [%date% %time%] CRM DISTRIBUIDORES - INICIO >> "%LOGFILE%"
echo [%date% %time%] Carpeta: %CD% >> "%LOGFILE%"
echo [%date% %time%] Usuario: %USERNAME% >> "%LOGFILE%"
echo [%date% %time%] Computadora: %COMPUTERNAME% >> "%LOGFILE%"
echo [%date% %time%] Sistema: %OS% %PROCESSOR_ARCHITECTURE% >> "%LOGFILE%"
echo [%date% %time%] ======================================== >> "%LOGFILE%"

:: ========================================
:: 1. VERIFICAR ARCHIVOS
:: ========================================
echo  [1/5] Verificando archivos...
echo [%date% %time%] [1/5] Verificando archivos... >> "%LOGFILE%"

set "FALTANTES=0"
set "LISTA_FALTANTES="

if exist "index.html" (echo [%date% %time%]   OK: index.html >> "%LOGFILE%") else (set "FALTANTES=1" & set "LISTA_FALTANTES=index.html " & echo [%date% %time%]   FALTA: index.html >> "%LOGFILE%")
if exist "apis\server.py" (echo [%date% %time%]   OK: apis/server.py >> "%LOGFILE%") else (set "FALTANTES=1" & set "LISTA_FALTANTES=%LISTA_FALTANTES%apis/server.py " & echo [%date% %time%]   FALTA: apis/server.py >> "%LOGFILE%")
if exist "apis\server.ps1" (echo [%date% %time%]   OK: apis/server.ps1 >> "%LOGFILE%") else (set "FALTANTES=1" & set "LISTA_FALTANTES=%LISTA_FALTANTES%apis/server.ps1 " & echo [%date% %time%]   FALTA: apis/server.ps1 >> "%LOGFILE%")
if exist "assets\js\app_secure.js" (echo [%date% %time%]   OK: app_secure.js >> "%LOGFILE%") else (set "FALTANTES=1" & set "LISTA_FALTANTES=%LISTA_FALTANTES%app_secure.js " & echo [%date% %time%]   FALTA: app_secure.js >> "%LOGFILE%")
if exist "assets\js\api_config.js" (echo [%date% %time%]   OK: api_config.js >> "%LOGFILE%") else (set "FALTANTES=1" & set "LISTA_FALTANTES=%LISTA_FALTANTES%api_config.js " & echo [%date% %time%]   FALTA: api_config.js >> "%LOGFILE%")
if exist "assets\css\styles_premium.css" (echo [%date% %time%]   OK: styles_premium.css >> "%LOGFILE%") else (set "FALTANTES=1" & set "LISTA_FALTANTES=%LISTA_FALTANTES%styles_premium.css " & echo [%date% %time%]   FALTA: styles_premium.css >> "%LOGFILE%")

if "%FALTANTES%"=="1" (
    echo [%date% %time%] [ERROR] Faltan: %LISTA_FALTANTES% >> "%LOGFILE%"
    echo  ERROR: Faltan archivos: %LISTA_FALTANTES%
    echo  Click derecho carpeta Dropbox - "Disponible sin conexion"
    echo  Log: %LOGFILE%
    pause
    exit /b 1
)

echo         Archivos OK
echo [%date% %time%]   Todos los archivos OK >> "%LOGFILE%"

:: ========================================
:: 2. NAVEGADOR
:: ========================================
echo  [2/5] Buscando navegador...
echo [%date% %time%] [2/5] Buscando navegador... >> "%LOGFILE%"

set "BROWSER="
set "BROWSER_NAME="

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe" & set "BROWSER_NAME=Chrome"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" & set "BROWSER_NAME=Chrome"
if not defined BROWSER if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "BROWSER=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" & set "BROWSER_NAME=Chrome"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" & set "BROWSER_NAME=Edge"
if not defined BROWSER if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" & set "BROWSER_NAME=Edge"
if not defined BROWSER if exist "%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe" & set "BROWSER_NAME=Edge"

if defined BROWSER (
    echo         %BROWSER_NAME% encontrado
    echo [%date% %time%]   Navegador: %BROWSER_NAME% >> "%LOGFILE%"
    echo [%date% %time%]   Ruta: %BROWSER% >> "%LOGFILE%"
) else (
    set "BROWSER_NAME=predeterminado"
    echo         No se encontro Chrome/Edge, usando predeterminado
    echo [%date% %time%]   [WARN] Chrome/Edge no encontrado, usando predeterminado >> "%LOGFILE%"
)

:: ========================================
:: 3. PUERTO
:: ========================================
echo  [3/5] Buscando puerto libre...
echo [%date% %time%] [3/5] Buscando puerto... >> "%LOGFILE%"

set "PORT="

netstat -aon 2>nul | findstr ":8080 " | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (set "PORT=8080") else (echo [%date% %time%]   8080 ocupado >> "%LOGFILE%")

if not defined PORT netstat -aon 2>nul | findstr ":8081 " | findstr "LISTENING" >nul 2>&1
if not defined PORT if errorlevel 1 (set "PORT=8081") else (echo [%date% %time%]   8081 ocupado >> "%LOGFILE%")

if not defined PORT netstat -aon 2>nul | findstr ":8082 " | findstr "LISTENING" >nul 2>&1
if not defined PORT if errorlevel 1 (set "PORT=8082") else (echo [%date% %time%]   8082 ocupado >> "%LOGFILE%")

if not defined PORT netstat -aon 2>nul | findstr ":3000 " | findstr "LISTENING" >nul 2>&1
if not defined PORT if errorlevel 1 (set "PORT=3000") else (echo [%date% %time%]   3000 ocupado >> "%LOGFILE%")

if not defined PORT netstat -aon 2>nul | findstr ":9090 " | findstr "LISTENING" >nul 2>&1
if not defined PORT if errorlevel 1 (set "PORT=9090") else (echo [%date% %time%]   9090 ocupado >> "%LOGFILE%")

:: Si todavia no hay puerto, forzar 8080
if not defined PORT (
    echo [%date% %time%]   [WARN] No se pudo detectar puerto libre, forzando 8080 >> "%LOGFILE%"
    set "PORT=8080"
)

echo         Puerto %PORT%
echo [%date% %time%]   Puerto: %PORT% >> "%LOGFILE%"

:: ========================================
:: 4. SERVIDOR
:: ========================================
echo  [4/5] Configurando servidor...
echo [%date% %time%] [4/5] Configurando servidor... >> "%LOGFILE%"

set "USE_PYTHON=0"

:: Verificar que Python sea REAL (no el alias de Microsoft Store)
python --version >nul 2>&1
if not errorlevel 1 (
    :: Doble verificacion: el alias de Store da exit code 9009
    python -c "print('ok')" >nul 2>&1
    if not errorlevel 1 (
        set "USE_PYTHON=1"
        echo         Python encontrado
        echo [%date% %time%]   Servidor: Python REAL detectado >> "%LOGFILE%"
    ) else (
        echo         Python es alias de Microsoft Store, usando PowerShell
        echo [%date% %time%]   [WARN] Python es alias de MS Store, no real >> "%LOGFILE%"
    )
) else (
    echo         Python no disponible, usando PowerShell
    echo [%date% %time%]   Python no disponible, usando PowerShell >> "%LOGFILE%"
)

:: ========================================
:: 5. INICIAR
:: ========================================
echo  [5/5] Iniciando...
echo [%date% %time%] [5/5] Iniciando servidor en puerto %PORT% >> "%LOGFILE%"
echo [%date% %time%]   URL: http://localhost:%PORT% >> "%LOGFILE%"
echo [%date% %time%]   Navegador: %BROWSER_NAME% >> "%LOGFILE%"
echo [%date% %time%]   Servidor: Python=%USE_PYTHON% >> "%LOGFILE%"

echo.
echo  ========================================
echo   URL: http://localhost:%PORT%
echo   Navegador: %BROWSER_NAME%
echo   Log: %LOGFILE%
echo.
echo   NO CERRAR ESTA VENTANA
echo  ========================================
echo.

:: Abrir navegador
if defined BROWSER (
    start "" "%BROWSER%" "http://localhost:%PORT%"
) else (
    start "" "http://localhost:%PORT%"
)
echo [%date% %time%] Navegador abierto >> "%LOGFILE%"

:: Minimizar CMD
timeout /t 2 /nobreak >nul
powershell -command "try{$w=Add-Type -MemberDefinition '[DllImport(\"user32.dll\")] public static extern bool ShowWindow(IntPtr h,int c);[DllImport(\"kernel32.dll\")] public static extern IntPtr GetConsoleWindow();' -Name W -Passthru; $w::ShowWindow($w::GetConsoleWindow(),6)}catch{}" >nul 2>&1

:: Iniciar servidor
echo [%date% %time%] Iniciando servidor... >> "%LOGFILE%"

if "%USE_PYTHON%"=="1" (
    echo  Servidor Python activo en puerto %PORT%...
    echo [%date% %time%] Ejecutando: python apis/server.py %PORT% >> "%LOGFILE%"
    python "%~dp0apis\server.py" %PORT% 2>> "%LOGFILE%"
) else (
    echo  Servidor PowerShell activo en puerto %PORT%...
    echo [%date% %time%] Ejecutando: powershell apis/server.ps1 %PORT% >> "%LOGFILE%"
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0apis\server.ps1" %PORT% 2>> "%LOGFILE%"
)

echo [%date% %time%] Servidor detenido (exit: %errorlevel%) >> "%LOGFILE%"
echo.
echo  Servidor detenido. Log: %LOGFILE%
pause
