import concurrent.futures
import importlib.util
import json
from pathlib import Path
import tempfile
import threading
import unittest
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from uuid import uuid4

spec = importlib.util.spec_from_file_location('server', Path(__file__).parents[1] / 'tracking/server.py')
s = importlib.util.module_from_spec(spec)
spec.loader.exec_module(s)

class TrackingTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = str(Path(self.tmp.name) / 'totals.sqlite3')
        s.initialize(self.path)
    def tearDown(self):
        self.tmp.cleanup()
    def test_concurrent_devices_and_duplicate_retry(self):
        receipt = str(uuid4())
        with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
            list(pool.map(lambda _: s.record(self.path, receipt, 'EX'), range(30)))
            list(pool.map(lambda _: s.record(self.path, str(uuid4()), 'PP'), range(40)))
        self.assertEqual(s.totals(self.path)['total'], 41)
        self.assertEqual(s.totals(self.path)['personalities']['EX'], 1)
        s.initialize(self.path)  # Process reinitialization cannot reset totals.
        self.assertEqual(s.totals(self.path)['total'], 41)
        self.assertFalse(s.record(self.path, receipt, 'CH'))
        self.assertEqual(s.totals(self.path)['personalities']['CH'], 0)
    def test_test_data_is_separate(self):
        test_path = str(Path(self.tmp.name) / 'test.sqlite3')
        s.initialize(test_path)
        s.record(test_path, str(uuid4()), 'RT')
        self.assertEqual(s.totals(self.path)['total'], 0)
    def test_http_validation_and_receipts(self):
        server = s.ThreadingHTTPServer(('127.0.0.1', 0), s.Handler)
        server.db_path = self.path
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        base = f'http://127.0.0.1:{server.server_port}'
        def post(data):
            req = Request(base+'/complete', data=json.dumps(data).encode(), headers={'Content-Type':'application/json'})
            with urlopen(req) as r: return json.load(r)
        try:
            data = {'id':str(uuid4()), 'personality':'SA'}
            self.assertTrue(post(data)['recorded'])
            self.assertFalse(post(data)['recorded'])
            for invalid in ({'id':'bad','personality':'SA'}, {'id':str(uuid4()),'personality':'XX'}, [], {'id':str(uuid4()),'personality':[]}):
                with self.assertRaises(HTTPError) as error: post(invalid)
                self.assertEqual(error.exception.code, 400)
            self.assertEqual(s.totals(self.path)['total'], 1)
            with urlopen(base+'/display-results') as response:
                self.assertEqual(response.headers['Cache-Control'], 'no-store')
                self.assertTrue(response.headers['Content-Type'].startswith('application/json'))
                display = json.load(response)
            self.assertEqual(display, {'total': 1, 'personalities': {'EX':0, 'PP':0, 'CC':0, 'RT':0, 'SA':1, 'CH':0}})
            with self.assertRaises(HTTPError) as error:
                urlopen(Request(base+'/display-results', data=b'{}', headers={'Content-Type':'application/json'}))
            self.assertEqual(error.exception.code, 404)  # Display endpoint cannot write.
            with urlopen(base+'/totals') as response:
                self.assertIn('Total completions', response.read().decode())
        finally:
            server.shutdown()
            server.server_close()
            thread.join()

if __name__ == '__main__': unittest.main()
