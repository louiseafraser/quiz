"""Local-only test harness for both URL mounts and their isolated databases."""
import argparse
import http.client
from contextlib import closing
import tempfile
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
from server import Handler, initialise


class LocalProxy(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def proxy(self):
        prefix, _, endpoint = self.path.lstrip('/').partition('/')
        port = self.server.api_ports.get(prefix)
        if port is None:
            return False
        with closing(http.client.HTTPConnection('127.0.0.1', port, timeout=10)) as connection:
            length = int(self.headers.get('Content-Length', '0'))
            headers = {'Content-Type': self.headers.get('Content-Type', '')}
            connection.request(self.command, '/' + endpoint, self.rfile.read(length), headers)
            response = connection.getresponse()
            body = response.read()
            self.send_response(response.status)
            self.send_header('Content-Type', response.getheader('Content-Type'))
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        return True

    def do_POST(self):
        if not self.proxy():
            self.send_error(404)

    def do_GET(self):
        if self.proxy():
            return
        for prefix in ('/coslaconf/', '/coslaconf-preview/'):
            if self.path.startswith(prefix):
                self.path = '/' + self.path[len(prefix):]
                super().do_GET()
                return
        self.send_error(404)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8090)
    args = parser.parse_args()
    with tempfile.TemporaryDirectory() as directory, ThreadingHTTPServer(
        ('127.0.0.1', args.port), partial(LocalProxy, directory=ROOT / 'public')
    ) as proxy:
        proxy.api_ports = {}
        servers = []
        for prefix in ('coslaconf-api', 'coslaconf-test-api'):
            backend = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
            backend.database = Path(directory) / (prefix + '.sqlite3')
            initialise(backend.database)
            threading.Thread(target=backend.serve_forever, daemon=True).start()
            servers.append(backend)
            proxy.api_ports[prefix] = backend.server_port
        print(f'http://127.0.0.1:{args.port}/coslaconf-preview/', flush=True)
        try:
            proxy.serve_forever()
        finally:
            for server in servers:
                server.shutdown()
                server.server_close()


if __name__ == '__main__':
    main()
