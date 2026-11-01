"""Download public source snapshots. Run preparation separately, offline."""
from pathlib import Path
import concurrent.futures, datetime, hashlib, html, json, re, urllib.request

ROOT=Path(__file__).resolve().parent.parent
RAW=ROOT/'scripts/raw/military'
RAW.mkdir(parents=True,exist_ok=True)
countries=json.loads((ROOT/'public/data/countries.json').read_text())
roster={c['id'] for c in countries}
ne=json.loads((ROOT/'scripts/raw/natural-earth.raw.geojson').read_text())
names={}
for f in ne['features']:
    p=f['properties']
    if p['ISO_A2_EH'] in roster:
        for key in ['ADMIN','NAME','NAME_LONG','NAME_EN']:
            names[str(p.get(key,'')).lower()]=p['ISO_A2_EH']
names.update({'turkiye':'TR','turkey':'TR','united states of america':'US','united states':'US','republic of serbia':'RS','serbia':'RS','republic of the congo':'CG','democratic republic of the congo':'CD','czechia':'CZ','ivory coast':'CI','macedonia':'MK','north macedonia':'MK','bangaladesh':'BD','bangladesh':'BD','beliz':'BZ','belize':'BZ','vietnam':'VN','tanzania':'TZ','laos':'LA','south korea':'KR','north korea':'KP'})

def download(url):
    with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'WorldConquestDataPreparation/1.1 (local educational game)'}),timeout=45) as r:
        return r.read()

base_url='https://www.globalfirepower.com/country-military-strength-detail.php?country_id='
base=RAW/'brazil.html'
if not base.exists():base.write_bytes(download(base_url+'brazil'))
links=re.findall(r'<a[^>]+href="([^\"]*country_id=[^\"]+)"[^>]*>(.*?)</a>',base.read_text(),re.S)
jobs={}
unmapped=[]
for href,label in links:
    name=html.unescape(re.sub('<[^>]+>','',label)).strip()
    if not name:continue
    slug=href.split('country_id=')[1].split('&')[0]
    if slug in ['taiwan','kosovo']:continue # No extra competitors or military aggregation of disputed states.
    code=names.get(name.lower())
    if not code:unmapped.append((name,slug));continue
    jobs[code]={'id':code,'slug':slug,'url':base_url+slug}
if unmapped:raise RuntimeError(f'Explicit mapping required: {unmapped}')

def save(job):
    filename=RAW/(job['slug']+'.html')
    if not filename.exists():filename.write_bytes(download(job['url']))
    body=filename.read_bytes()
    if b'Active Personnel' not in body:raise RuntimeError(f"No country inventory in {job['slug']}")
    return {**job,'file':filename.name,'sha256':hashlib.sha256(body).hexdigest()}

with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
    records=list(pool.map(save,jobs.values()))
    print(f'Cached {len(records)} GFP country pages.',flush=True)
for name,indicator in [('personnel','MS.MIL.TOTL.P1'),('spending','MS.MIL.XPND.CD')]:
    target=RAW/(name+'.json')
    if not target.exists():target.write_bytes(download(f'https://api.worldbank.org/v2/country/all/indicator/{indicator}?format=json&mrnev=1&per_page=20000'))
manifest={'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'edition':2026,'countries':records}
(RAW/'manifest.json').write_text(json.dumps(manifest,indent=2))
print('Snapshots ready. Run npm run data:military.',flush=True)
