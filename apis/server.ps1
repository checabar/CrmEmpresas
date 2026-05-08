# ============================================
# Servidor HTTP para CRM Distribuidores
# Con soporte de logging (POST /crm-log)
# Acepta puerto como parametro: .\server.ps1 8080
# ============================================

param(
    [int]$port = 8080
)

# La raiz del CRM es la carpeta padre de apis/
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $scriptDir
$logsDir = Join-Path $root 'logs'

if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host ""
    Write-Host "  Servidor listo en http://localhost:$port" -ForegroundColor Green
    Write-Host "  Carpeta: $root"
    Write-Host "  Logs en: $logsDir"
    Write-Host "  Presiona Ctrl+C para detener"
    Write-Host ""
} catch {
    Write-Host ""
    Write-Host "  ERROR al iniciar el servidor:" -ForegroundColor Red
    Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Posibles causas:"
    Write-Host "  - Antivirus bloqueando conexiones"
    Write-Host "  - Politicas de empresa restrictivas"
    Write-Host "  - Firewall de Windows bloqueando"
    Write-Host ""
    Write-Host "  SOLUCION: Instala Python desde https://python.org"
    Write-Host "  y volve a ejecutar INICIAR_CRM.bat"
    Write-Host ""
    Read-Host "  Presiona Enter para salir"
    exit 1
}

$mimeTypes = @{
    '.html'  = 'text/html; charset=utf-8'
    '.js'    = 'application/javascript; charset=utf-8'
    '.css'   = 'text/css; charset=utf-8'
    '.json'  = 'application/json; charset=utf-8'
    '.txt'   = 'text/plain; charset=utf-8'
    '.md'    = 'text/plain; charset=utf-8'
    '.jpg'   = 'image/jpeg'
    '.jpeg'  = 'image/jpeg'
    '.png'   = 'image/png'
    '.gif'   = 'image/gif'
    '.svg'   = 'image/svg+xml'
    '.ico'   = 'image/x-icon'
    '.woff'  = 'font/woff'
    '.woff2' = 'font/woff2'
}

while ($listener.IsListening) {
    try {
        $ctx = $listener.GetContext()
        $req = $ctx.Request
        $resp = $ctx.Response

        $resp.Headers.Add('Access-Control-Allow-Origin', '*')
        $resp.Headers.Add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        $resp.Headers.Add('Access-Control-Allow-Headers', 'Content-Type')

        # OPTIONS (preflight)
        if ($req.HttpMethod -eq 'OPTIONS') {
            $resp.StatusCode = 200
            $resp.OutputStream.Close()
            continue
        }

        # POST /crm-log - guardar logs
        if ($req.HttpMethod -eq 'POST' -and $req.Url.LocalPath -eq '/crm-log') {
            try {
                $reader = New-Object System.IO.StreamReader($req.InputStream)
                $body = $reader.ReadToEnd()
                $reader.Close()

                $logFile = Join-Path $logsDir ("crm_" + (Get-Date -Format 'yyyy-MM-dd') + ".log")
                
                $entries = $body | ConvertFrom-Json
                foreach ($entry in $entries) {
                    $line = $entry | ConvertTo-Json -Compress
                    Add-Content -Path $logFile -Value $line -Encoding UTF8
                }

                $resp.StatusCode = 200
                $resp.ContentType = 'text/plain'
                $okBytes = [System.Text.Encoding]::UTF8.GetBytes("OK")
                $resp.OutputStream.Write($okBytes, 0, $okBytes.Length)
                Write-Host "  LOG +$($entries.Count) entries" -ForegroundColor Cyan
            } catch {
                $resp.StatusCode = 500
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes($_.Exception.Message)
                $resp.OutputStream.Write($errBytes, 0, $errBytes.Length)
                Write-Host "  LOG ERROR: $($_.Exception.Message)" -ForegroundColor Red
            }
            $resp.OutputStream.Close()
            continue
        }

        # GET - servir archivos
        $url = $req.Url.LocalPath
        if ($url -eq '/') { $url = '/index.html' }

        $filePath = Join-Path $root ($url.TrimStart('/') -replace '/', '\')

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $resp.ContentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { 'application/octet-stream' }
            
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $resp.ContentLength64 = $bytes.Length
            $resp.OutputStream.Write($bytes, 0, $bytes.Length)
            Write-Host "  200 $url"
        } else {
            $resp.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 - $url not found at $filePath")
            $resp.OutputStream.Write($msg, 0, $msg.Length)
            Write-Host "  404 $url (Full Path checked: $filePath)" -ForegroundColor Yellow
        }

        $resp.OutputStream.Close()
    } catch {
        # Ignorar errores de conexion cerrada
    }
}
