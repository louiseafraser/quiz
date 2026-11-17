"""COSLA anonymous survey service. The reverse proxy exposes only two routes."""
import argparse
import csv
import json
import re
import sqlite3
import sys
from contextlib import closing
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

OPTIONS = 'ABCDE'
UUID = re.compile(r'[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}')
COLUMNS = ('q1', 'q2', 'q3', 'q4')


def connect(path):
    return closing(sqlite3.connect(path, timeout=5))


def initialise(path):
    with connect(path) as db, db:
        db.execute('''CREATE TABLE IF NOT EXISTS responses (
            id TEXT PRIMARY KEY, q1 TEXT NOT NULL, q2 TEXT NOT NULL,
            q3 TEXT NOT NULL, q4 TEXT NOT NULL)''')


def results(db):
    counts = [[0] * len(OPTIONS) for _ in COLUMNS]
    rows = db.execute('SELECT q1,q2,q3,q4,COUNT(*) FROM responses GROUP BY q1,q2,q3,q4')
    total = 0
    for *answers, n in rows:
        total += n
        for question, answer in enumerate(answers):
            counts[question][OPTIONS.index(answer)] += n
    return {'total': total, 'questions': [{'counts': row} for row in counts]}


class Handler(BaseHTTPRequestHandler):
    def setup(self):
        super().setup()
        self.connection.settimeout(8)

    def log_message(self, *_):
        pass

    def send_json(self, status, data):
        payload = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(payload)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        if self.path != '/display-results':
            self.send_json(404, {'error': 'not_found'})
            return
        try:
            with connect(self.server.database) as db:
                data = results(db)
        except sqlite3.Error as error:
            print(error, file=sys.stderr, flush=True)
            self.send_json(503, {'error': 'temporarily_unavailable'})
            return
        self.send_json(200, data)

    def do_POST(self):
        if self.path != '/complete':
            self.send_json(404, {'error': 'not_found'})
            return
        if self.headers.get_content_type() != 'application/json':
            self.send_json(415, {'error': 'expected_json'})
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 1024:
                raise ValueError
            body = json.loads(self.rfile.read(length))
            if not isinstance(body, dict) or set(body) != {'id', 'answers'}:
                raise ValueError
            response_id, answers = body['id'], body['answers']
            if not isinstance(response_id, str) or not UUID.fullmatch(response_id):
                raise ValueError
            if not isinstance(answers, list) or len(answers) != len(COLUMNS):
                raise ValueError
            if any(not isinstance(a, str) or len(a) != 1 or a not in OPTIONS for a in answers):
                raise ValueError
        except (ValueError, RecursionError, TimeoutError):
            self.send_json(400, {'error': 'invalid_submission'})
            return

        try:
            with connect(self.server.database) as db, db:
                db.execute('INSERT INTO responses VALUES (?,?,?,?,?) ON CONFLICT(id) DO NOTHING',
                           (response_id, *answers))
                saved = db.execute('SELECT q1,q2,q3,q4 FROM responses WHERE id=?',
                                   (response_id,)).fetchone()
        except sqlite3.Error as error:
            print(error, file=sys.stderr, flush=True)
            self.send_json(503, {'error': 'temporarily_unavailable'})
            return
        if saved != tuple(answers):
            self.send_json(409, {'error': 'submission_id_conflict'})
        else:
            self.send_json(200, {'ok': True})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', type=Path, required=True)
    parser.add_argument('--port', type=int)
    parser.add_argument('--confirm-reset', action='store_true')
    parser.add_argument('command', choices=('serve', 'totals', 'export', 'reset'))
    args = parser.parse_args()
    if args.command == 'serve':
        if not args.port:
            parser.error('serve requires --port')
        initialise(args.database)
        with ThreadingHTTPServer(('127.0.0.1', args.port), Handler) as server:
            server.database = args.database
            server.serve_forever()
        return
    if not args.database.is_file():
        parser.error('database does not exist')
    if args.command == 'reset' and not args.confirm_reset:
        parser.error('reset requires --confirm-reset')
    with connect(args.database) as db, db:
        if args.command == 'totals':
            print(json.dumps(results(db), indent=2))
        elif args.command == 'export':
            writer = csv.writer(sys.stdout)
            writer.writerow(COLUMNS)
            writer.writerows(db.execute('SELECT q1,q2,q3,q4 FROM responses'))
        else:
            deleted = db.execute('DELETE FROM responses').rowcount
            print(f'Deleted {deleted} responses')


if __name__ == '__main__':
    main()
