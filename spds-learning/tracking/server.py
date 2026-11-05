#!/usr/bin/env python3
"""Small loopback-only aggregate counter. Put NGINX authentication before /totals."""
import hashlib
import json
import os
from pathlib import Path
import sqlite3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from uuid import UUID

TYPES = ('EX', 'PP', 'CC', 'RT', 'SA', 'CH')
NAMES = ('Curious Explorer', 'Practical Pioneer', 'Collaborative Connector',
         'Reflective Thinker', 'Strategic Achiever', 'Creative Challenger')

def initialize(path):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(path) as db:
        db.execute('PRAGMA journal_mode=WAL')
        db.execute('CREATE TABLE IF NOT EXISTS totals (personality TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0)')
        # No answers, identity, timestamp or personality associated with receipt hashes.
        db.execute('CREATE TABLE IF NOT EXISTS receipts (digest TEXT PRIMARY KEY)')
        db.executemany('INSERT OR IGNORE INTO totals(personality) VALUES (?)', [(t,) for t in TYPES])
    os.chmod(path, 0o600)

def record(path, receipt, personality):
    if personality not in TYPES or not isinstance(receipt, str):
        raise ValueError('Invalid completion')
    parsed = UUID(receipt)
    if parsed.version != 4 or str(parsed) != receipt:
        raise ValueError('Invalid completion ID')
    digest = hashlib.sha256(receipt.encode()).hexdigest()
    with sqlite3.connect(path, timeout=10) as db:
        db.execute('BEGIN IMMEDIATE')
        inserted = db.execute('INSERT OR IGNORE INTO receipts VALUES (?)', (digest,)).rowcount
        if inserted:
            db.execute('UPDATE totals SET count=count+1 WHERE personality=?', (personality,))
    return bool(inserted)

def totals(path):
    with sqlite3.connect(path, timeout=10) as db:
        counts = dict(db.execute('SELECT personality, count FROM totals'))
    return {'total': sum(counts.values()), 'personalities': counts}

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass  # Do not retain visitor IPs in application logs.

    def respond(self, status, body, content_type='application/json; charset=utf-8'):
        data = body.encode() if isinstance(body, str) else json.dumps(body).encode()
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        if self.path != '/complete':
            return self.respond(404, {'error': 'Not found'})
        if self.headers.get('Content-Type', '').split(';')[0] != 'application/json' or self.headers.get('Sec-Fetch-Site') == 'cross-site':
            return self.respond(415, {'error': 'JSON required from same site'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 512:
                return self.respond(413, {'error': 'Invalid size'})
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload, dict) or set(payload) != {'id', 'personality'}:
                raise ValueError('Invalid payload')
            if not isinstance(payload['personality'], str):
                raise ValueError('Invalid personality')
            added = record(self.server.db_path, payload['id'], payload['personality'])
        except (ValueError, TypeError, AttributeError):
            return self.respond(400, {'error': 'Invalid completion'})
        except sqlite3.Error:
            return self.respond(503, {'error': 'Please retry'})
        self.respond(200, {'recorded': added})

    def do_GET(self):
        if self.path not in ('/totals', '/display-results'):
            return self.respond(404, {'error': 'Not found'})
        try:
            data = totals(self.server.db_path)
        except sqlite3.Error:
            return self.respond(503, {'error': 'Please retry'})
        if self.path == '/display-results':
            # Read-only aggregate data for the public conference TV, no receipts.
            return self.respond(200, data)
        rows = ''.join(f'<tr><td>{name}</td><td>{data["personalities"][key]}</td></tr>' for key, name in zip(TYPES, NAMES))
        self.respond(200, '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width">'
                     '<title>Learning Superpower totals</title><style>body{font:20px Arial;margin:40px;color:#243b42}'
                     'table{border-collapse:collapse}td,th{padding:12px;text-align:left;border-bottom:1px solid #ddd}</style>'
                     '<h1>Learning Superpower totals</h1><p>Refresh this page to update.</p>'
                     '<table><thead><tr><th>Personality</th><th>Total</th></tr></thead><tbody>' + rows +
                     f'<tr><th>Total completions</th><th>{data["total"]}</th></tr></tbody></table></html>', 'text/html; charset=utf-8')

if __name__ == '__main__':
    os.umask(0o077)
    path = os.environ['SPDS_DB']
    initialize(path)
    server = ThreadingHTTPServer(('127.0.0.1', int(os.environ.get('SPDS_PORT', '8765'))), Handler)
    server.db_path = path
    server.serve_forever()
