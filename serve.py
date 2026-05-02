import http.server, socketserver, sys, os, pathlib

PORT = int(os.environ.get("PORT", sys.argv[1] if len(sys.argv) > 1 else 8081))

# .env.local から環境変数を読み込む
def load_dotenv(path):
    env = {}
    p = pathlib.Path(path)
    if not p.exists():
        return env
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env

# .env.local があればそこから、なければ OS 環境変数からプレースホルダーを解決
dotenv = load_dotenv(pathlib.Path(__file__).parent / ".env.local")
for key in ("VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"):
    if key not in dotenv and os.environ.get(key):
        dotenv[key] = os.environ[key]

class EnvInjectHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_GET(self):
        # index.html の場合はプレースホルダーを置換して返す
        if self.path in ("/", "/index.html"):
            try:
                html_path = pathlib.Path(__file__).parent / "index.html"
                content = html_path.read_text(encoding="utf-8")
                for key, value in dotenv.items():
                    content = content.replace(f"%%{key}%%", value)
                encoded = content.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(encoded)))
                self.end_headers()
                self.wfile.write(encoded)
            except Exception as e:
                self.send_error(500, str(e))
            return
        super().do_GET()

with socketserver.TCPServer(("", PORT), EnvInjectHandler) as httpd:
    loaded = ", ".join(dotenv.keys()) if dotenv else "(none)"
    print(f"Serving on http://localhost:{PORT}")
    print(f"Loaded env vars: {loaded}")
    httpd.serve_forever()
