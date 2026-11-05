# Finds and fetches free sound recordings from Wikimedia Commons, for picking the town's sounds. Only recordings that
# are public domain or CC0 (free for anything, no conditions) are kept. Runs on GitHub's build machines
# (.github/workflows/fetch-assets.yml); the picked files are then checked and added by tools/prepare_sounds.py.
#
#   python3 tools/fetch_commons.py "search:crow;cricket night;bicycle bell" out   -> out/found.json
#   python3 tools/fetch_commons.py "get:File:Crow.ogg|File:Bell.wav" out           -> out/sounds/... + out/info.json
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API = 'https://commons.wikimedia.org/w/api.php'
UA = {'User-Agent': 'KTOWN-asset-fetch/1.0 (https://github.com/azeembukhariprivate/ktown)'}
FREE = re.compile(r'^(cc0|cc-zero|public domain|pd\b|pd-)', re.I)


def get(url, tries=6):
    # Wikimedia asks bots to go gently: wait between requests, and longer when told "too many requests".
    for attempt in range(tries):
        time.sleep(1.5)
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code != 429 or attempt == tries - 1:
                raise
            wait = int(e.headers.get('Retry-After') or 0) or 15 * (attempt + 1)
            print('  asked to wait', wait, 's')
            time.sleep(wait)


def api(**params):
    params.update(format='json', formatversion='2')
    return json.loads(get(API + '?' + urllib.parse.urlencode(params)))


def plain(html):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', html or '')).strip()


def describe(page):
    ii = (page.get('imageinfo') or [{}])[0]
    meta = ii.get('extmetadata') or {}
    m = {k: v.get('value') for k, v in meta.items()}
    length = None
    for item in ii.get('metadata') or []:
        if item.get('name') in ('length', 'playtime_seconds', 'duration'):
            try:
                length = float(item.get('value'))
            except (TypeError, ValueError):
                pass
    return {
        'title': page['title'], 'url': ii.get('url'), 'size': ii.get('size'), 'mime': ii.get('mime'), 'seconds': length,
        'licence': plain(m.get('LicenseShortName')), 'by': plain(m.get('Artist')), 'credit': plain(m.get('Credit')),
        'about': plain(m.get('ImageDescription'))[:300], 'page': 'https://commons.wikimedia.org/wiki/' + urllib.parse.quote(page['title'].replace(' ', '_'))
    }


def search(queries, out):
    found = {}
    for q in queries:
        res = api(action='query', generator='search', gsrsearch=q + ' filetype:audio', gsrnamespace=6, gsrlimit=40,
                  prop='imageinfo', iiprop='url|size|mime|extmetadata|metadata')
        items = [describe(p) for p in (res.get('query') or {}).get('pages', [])]
        found[q] = [i for i in items if FREE.match(i['licence'] or '')]
        print(q, len(items), 'found,', len(found[q]), 'free')
    with open(os.path.join(out, 'found.json'), 'w') as f:
        json.dump(found, f, indent=1)


def fetch(titles, out):
    info = {}
    os.makedirs(os.path.join(out, 'sounds'), exist_ok=True)
    for t in titles:
        res = api(action='query', titles=t, prop='imageinfo', iiprop='url|size|mime|extmetadata|metadata')
        d = describe(res['query']['pages'][0])
        if not FREE.match(d['licence'] or ''):
            print('NOT FREE, skipped:', t, d['licence'])
            continue
        name = re.sub(r'[^A-Za-z0-9._-]+', '_', t.split(':', 1)[1])
        with open(os.path.join(out, 'sounds', name), 'wb') as f:
            f.write(get(d['url']))
        d['file'] = 'sounds/' + name
        info[t] = d
        print(t, d['licence'], d['size'])
    with open(os.path.join(out, 'info.json'), 'w') as f:
        json.dump(info, f, indent=1)


def main():
    what, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    kind, _, rest = what.partition(':')
    if kind == 'search':
        search([q.strip() for q in rest.split(';') if q.strip()], out)
    elif kind == 'get':
        fetch([t.strip() for t in rest.split('|') if t.strip()], out)


if __name__ == '__main__':
    main()
