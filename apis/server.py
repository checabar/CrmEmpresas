"""
Servidor HTTP para CRM Distribuidores con soporte de logging.
Sirve archivos estáticos y recibe POST en /crm-log para guardar logs.
"""
import http.server
import json
import os
import sys
from datetime import datetime

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
# La raiz del CRM es la carpeta padre de apis/
CRM_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGS_DIR = os.path.join(CRM_ROOT, 'logs')

os.makedirs(LOGS_DIR, exist_ok=True)


def get_log_filename():
    return os.path.join(LOGS_DIR, f"crm_{datetime.now().strftime('%Y-%m-%d')}.log")


class CRMHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/crm-log':
            try:
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length)
                entries = json.loads(body)

                log_file = get_log_filename()
                with open(log_file, 'a', encoding='utf-8') as f:
                    for entry in entries:
                        line = json.dumps(entry, ensure_ascii=False)
                        f.write(line + '\n')

                self.send_response(200)
                self.send_header('Content-Type', 'text/plain')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(b'OK')
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def log_message(self, format, *args):
        # Formato más limpio
        print(f"  {args[0]}")


if __name__ == '__main__':
    os.chdir(CRM_ROOT)
    server = http.server.HTTPServer(('', PORT), CRMHandler)
    print(f'  Servidor listo en http://localhost:{PORT}')
    print(f'  Logs en: {LOGS_DIR}')
    print()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n  Servidor detenido.')
