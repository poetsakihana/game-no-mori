#!/usr/bin/env python3
"""Read-only static/source/hash/mirror checks; never stages or publishes files."""
from pathlib import Path
import hashlib,json,re,sys,zipfile
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'public/games/voice-life';DST=ROOT.parent/'zatuplay/games/voice-life'
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
original=ROOT/'scripts/voice-life-original.html'
assert original.stat().st_size==50990
assert sha(original)=='bdd27499adc865024ab8ef492a1ce13b765d7fc79c556540df3cd60254b58a79'
source={p.relative_to(SRC).as_posix():p for p in SRC.rglob('*') if p.is_file()}
mirror={p.relative_to(DST).as_posix():p for p in DST.rglob('*') if p.is_file()}
assert set(source)==set(mirror),'mirror paths differ'
for k,p in source.items(): assert p.read_bytes()==mirror[k].read_bytes(),k+' mirror differs'
html=(SRC/'index.html').read_text()
assert 'href="../../browser/"' in html
assert 'connect-src \'none\'' in html
assert not re.search(r'<(?:script|link|img)[^>]+(?:src|href)=["\']https?://',html)
for name in ['storage.js','app.js','browser.css']:
 assert f'{name}?v=7.0-web.1-{sha(SRC/name)[:12]}' in html,name+' stale asset reference'
app=(SRC/'app.js').read_text();storage=(SRC/'storage.js').read_text()
assert 'localStorage' not in app
for key in ['voice-life-v1','voice-life-v4','voice-life-media-v7','voice-life-social-v7']:
 assert key not in storage,'native key access risk'
assert 'getUserMedia({audio:true})' in app
assert 'fetch(' not in app+storage and 'XMLHttpRequest' not in app+storage and 'WebSocket' not in app+storage
for line in (ROOT/'scripts/voice-life-files.sha256').read_text().splitlines():
 digest,relative=line.split('  ',1);p=ROOT.parent/relative;assert sha(p)==digest,relative+' checksum differs'
apk_checked=False
if len(sys.argv)>1:
 apk=Path(sys.argv[1]);assert apk.stat().st_size==37397
 assert sha(apk)=='3c25fd980bb97e69e32aa6c22fb8e3cdd72ad558590eb46ffe4003d479557b4f'
 with zipfile.ZipFile(apk) as z: assert z.read('assets/index.html')==original.read_bytes()
 apk_checked=True
print(json.dumps({'status':'PASS','mirrorFiles':len(source),'sourceOracleHashVerified':True,'apkBytesVerified':apk_checked,'versionedAssets':True,'staticNetworkAndNativeKeyChecks':True,'scope':'Static/source checksum verification, not actual browser QA'},indent=2))
