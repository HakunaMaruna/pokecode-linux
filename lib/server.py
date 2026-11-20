#!/usr/bin/env python3
import http.server
import json
import os
import subprocess
import urllib.parse
import webbrowser
from pathlib import Path

ROOT = Path(os.environ.get("POKECODE_WORKSPACE", os.getcwd())).resolve()
PORT = int(os.environ.get("POKECODE_PORT", "8765"))


def safe_path(rel):
    p = (ROOT / rel).resolve()
    if ROOT not in p.parents and p != ROOT:
        return None
    return p


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        webdir = Path(__file__).resolve().parent.parent / "web"
        super().__init__(*a, directory=str(webdir), **k)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/files":
            self._files()
            return
        if parsed.path == "/api/file":
            qs = urllib.parse.parse_qs(parsed.query)
            rel = qs.get("path", [""])[0]
            p = safe_path(rel)
            if not p or not p.is_file():
                self._json({"error": "not found"}, 404)
                return
            try:
                text = p.read_text(encoding="utf-8")
            except Exception as e:
                self._json({"error": str(e)}, 500)
                return
            self._json({"path": rel, "content": text})
            return
        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b""
        try:
            data = json.loads(raw.decode("utf-8")) if raw else {}
        except Exception:
            data = {}
        if parsed.path == "/api/save":
            rel = data.get("path", "")
            content = data.get("content", "")
            p = safe_path(rel)
            if not p:
                self._json({"error": "invalid path"}, 400)
                return
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(content, encoding="utf-8")
            self._json({"ok": True})
            return
        if parsed.path == "/api/run":
            cmd = data.get("command", "")
            if not cmd:
                self._json({"error": "empty command"}, 400)
                return
            try:
                proc = subprocess.run(
                    cmd, shell=True, cwd=str(ROOT),
                    capture_output=True, text=True, timeout=60
                )
                self._json({"stdout": proc.stdout, "stderr": proc.stderr, "code": proc.returncode})
            except subprocess.TimeoutExpired:
                self._json({"stdout": "", "stderr": "timeout", "code": 124})
            except Exception as e:
                self._json({"stdout": "", "stderr": str(e), "code": 1})
            return
        if parsed.path == "/api/mkdir":
            rel = data.get("path", "")
            p = safe_path(rel)
            if not p:
                self._json({"error": "invalid path"}, 400)
                return
            p.mkdir(parents=True, exist_ok=True)
            self._json({"ok": True})
            return
        self._json({"error": "not found"}, 404)

    def _files(self):
        entries = []
        for p in sorted(ROOT.rglob("*")):
            if p.is_file():
                rel = p.relative_to(ROOT).as_posix()
                entries.append(rel)
        self._json({"root": str(ROOT), "files": entries})

    def _json(self, obj, code=200):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main():
    os.chdir(str(ROOT))
    httpd = http.server.HTTPServer(("127.0.0.1", PORT), Handler)
    url = f"http://127.0.0.1:{PORT}/"
    print(f"PokeCode IDE running at {url}")
    print(f"Workspace: {ROOT}")
    try:
        webbrowser.open(url)
    except Exception:
        pass
    httpd.serve_forever()


if __name__ == "__main__":
    main()
PYEOF