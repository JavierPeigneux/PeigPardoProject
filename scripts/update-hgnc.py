#!/usr/bin/env python3
"""Refresh the local approved-symbol catalogue from the official HGNC download."""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen

SOURCE = 'https://storage.googleapis.com/public-download-files/hgnc/json/json/hgnc_complete_set.json'
ROOT = Path(__file__).resolve().parent.parent
with urlopen(SOURCE, timeout=60) as response:
    raw = response.read()
docs = json.loads(raw)['response']['docs']
genes = sorted([[d['symbol'], d['name']] for d in docs if d['status'] == 'Approved'], key=lambda g: g[0].casefold())
assert len(genes) > 40000 and len({g[0] for g in genes}) == len(genes)
(ROOT / 'hgnc-catalog.js').write_text('// Approved HGNC symbols and names. See hgnc-source.json for provenance.\nconst HGNC_GENES = ' + json.dumps(genes, ensure_ascii=False, separators=(',', ':')) + ';\n')
(ROOT / 'hgnc-source.json').write_text(json.dumps({'source': SOURCE, 'reference': 'https://www.genenames.org/download/', 'retrieved_at': datetime.now(timezone.utc).isoformat(), 'source_sha256': hashlib.sha256(raw).hexdigest(), 'approved_symbols': len(genes)}, indent=2) + '\n')
print(f'Catálogo local: {len(genes)} símbolos aprobados')
