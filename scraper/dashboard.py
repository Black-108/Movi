"""
Movi Scraper Web Dashboard
Run: python dashboard.py  (or double-click run_dashboard.bat)
Opens at http://localhost:5050

Features:
 - Site cards with record counts, last-run time, content-type breakdown
 - Run all sites or a single site with one click
 - Toggle Combined (one Movi.json) vs Split (per-site files) output
 - Live log streaming while the scraper runs
"""

import json
import sys
import subprocess
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

from flask import Flask, Response, jsonify, render_template_string, request

BASE_DIR  = Path(__file__).parent
CFG_PATH  = BASE_DIR / "config" / "sites.json"
VENV_PY   = BASE_DIR / "venv" / "Scripts" / "python.exe"
PYTHON    = str(VENV_PY) if VENV_PY.exists() else sys.executable

_log_buffer: list = []
_running = False
_lock = threading.Lock()


def load_config() -> dict:
    with open(CFG_PATH, encoding="utf-8") as f:
        return json.load(f)


def resolve_paths(config: dict):
    raw = config.get("output_path", "./Movi.json")
    combined = (BASE_DIR / raw).resolve()
    split_dir = combined.parent / "site_data"
    return combined, split_dir


def file_stats(path: Path) -> dict:
    if not path.exists():
        return {"exists": False}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {"exists": True, "error": "invalid JSON"}
    by_type: dict = {}
    for r in data:
        ct = r.get("content_type", "movie")
        by_type[ct] = by_type.get(ct, 0) + 1
    mtime = datetime.fromtimestamp(path.stat().st_mtime).strftime("%Y-%m-%d %H:%M")
    size_kb = round(path.stat().st_size / 1024, 1)
    return {
        "exists": True,
        "records": len(data),
        "size_kb": size_kb,
        "updated": mtime,
        "by_type": by_type,
    }


def run_scraper(site_key: Optional[str], split: bool, limit: Optional[int]):
    global _running, _log_buffer
    with _lock:
        if _running:
            return
        _running = True
        _log_buffer = []

    cmd = [PYTHON, str(BASE_DIR / "run_scraper.py")]
    if site_key:
        cmd += ["--site", site_key]
    if split:
        cmd.append("--split")
    if limit:
        cmd += ["--limit", str(limit)]

    def _stream():
        global _running
        try:
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
                cwd=str(BASE_DIR),
            )
            for line in proc.stdout:
                line = line.rstrip()
                with _lock:
                    _log_buffer.append(line)
            proc.wait()
            with _lock:
                _log_buffer.append(f"\n--- Exit code: {proc.returncode} ---")
        except Exception as exc:
            with _lock:
                _log_buffer.append(f"[ERROR] {exc}")
        finally:
            global _running
            _running = False

    threading.Thread(target=_stream, daemon=True).start()


app = Flask(__name__)

PAGE = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Movi Scraper Dashboard</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:#0f0f0f;color:#e8e8e8;font-size:14px}
header{background:#18181b;border-bottom:1px solid #2a2a2e;padding:14px 24px;display:flex;align-items:center;gap:12px}
header h1{font-size:18px;font-weight:600}
header span{font-size:12px;color:#888;margin-left:auto}
main{padding:24px;max-width:1100px}
h2{font-size:11px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:.06em;margin:0 0 12px}
.controls{display:flex;gap:10px;margin-bottom:28px;flex-wrap:wrap;align-items:center}
.controls label{font-size:12px;color:#aaa}
select,input[type=number]{background:#1c1c1f;border:1px solid #333;color:#e8e8e8;padding:6px 10px;border-radius:6px;font-size:12px}
button{padding:7px 18px;border-radius:6px;border:none;font-size:12px;font-weight:500;cursor:pointer;transition:.15s}
.btn-run{background:#2563eb;color:#fff}.btn-run:hover{background:#1d4ed8}
.btn-run:disabled{background:#333;color:#666;cursor:default}
.btn-sm{background:#27272a;color:#d4d4d8;padding:5px 12px;font-size:11px}.btn-sm:hover{background:#3f3f46}
.toggle-wrap{display:flex;align-items:center;gap:8px;font-size:12px;color:#aaa}
.toggle{width:36px;height:20px;appearance:none;-webkit-appearance:none;background:#3f3f46;border-radius:10px;position:relative;cursor:pointer;transition:.2s}
.toggle:checked{background:#2563eb}
.toggle::after{content:'';position:absolute;width:14px;height:14px;background:#fff;border-radius:50%;top:3px;left:3px;transition:.2s}
.toggle:checked::after{left:19px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;margin-bottom:28px}
.card{background:#18181b;border:1px solid #2a2a2e;border-radius:10px;padding:16px}
.card-head{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.dot-on{background:#22c55e}.dot-off{background:#52525b}
.card-name{font-weight:600;font-size:14px}
.card-url{font-size:11px;color:#555;margin-bottom:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.stat-row{display:flex;justify-content:space-between;font-size:11px;color:#777;margin:3px 0}
.stat-val{color:#d4d4d8;font-weight:500}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:500;margin:2px}
.b-movie{background:#1e3a5f;color:#60a5fa}
.b-series{background:#14532d;color:#4ade80}
.b-anime{background:#4a044e;color:#e879f9}
.log-box{background:#0a0a0a;border:1px solid #27272a;border-radius:8px;padding:14px;height:340px;overflow-y:auto;font-family:'Cascadia Code',Consolas,monospace;font-size:12px;line-height:1.6}
.log-box p{margin:0;white-space:pre-wrap;word-break:break-all}
.ok{color:#4ade80}.err{color:#f87171}.dim{color:#444}.head{color:#facc15}
.spinner{display:inline-block;width:12px;height:12px;border:2px solid #333;border-top-color:#2563eb;border-radius:50%;animation:spin .7s linear infinite;vertical-align:middle;margin-right:5px}
@keyframes spin{to{transform:rotate(360deg)}}
.status-bar{margin-bottom:14px;font-size:11px;color:#666;display:flex;align-items:center;gap:5px}
.no-data{font-size:11px;color:#444;margin-top:4px}
</style>
</head>
<body>
<header>
  <h1>Movi Scraper Dashboard</h1>
  <span id="ts">Loading…</span>
</header>
<main>

<h2 style="margin-top:0">Run scraper</h2>
<div class="controls">
  <label>Site</label>
  <select id="site-sel"><option value="">All enabled sites</option></select>

  <label>Mode</label>
  <div class="toggle-wrap">
    <span>Combined</span>
    <input type="checkbox" class="toggle" id="split-toggle">
    <span>Split per-site files</span>
  </div>

  <label>Test limit</label>
  <input type="number" id="limit-in" placeholder="e.g. 10" style="width:80px">

  <button class="btn-run" id="run-btn" onclick="startRun()">&#9654; Run</button>
</div>

<h2>Output files</h2>
<div class="grid" id="cards">Loading…</div>

<div class="status-bar" id="status-bar"></div>
<h2>Live log</h2>
<div class="log-box" id="log-box"><p class="dim">Log output appears here when scraper runs.</p></div>

</main>
<script>
let esSource = null;
let logLines = [];

function ts(){return new Date().toLocaleTimeString()}

function badge(type, n){
  const cls={movie:'b-movie',series:'b-series',anime:'b-anime'}[type]||'b-movie';
  return `<span class="badge ${cls}">${type} ${n}</span>`;
}

function renderCards(data){
  const g = document.getElementById('cards');
  if(!data.sites||!data.sites.length){g.innerHTML='<p style="color:#555">No sites configured.</p>';return;}
  g.innerHTML = data.sites.map(s=>{
    const dot = s.enabled?'dot-on':'dot-off';
    const stat = s.stats;
    let inner='';
    if(stat&&stat.exists&&!stat.error){
      inner=`<div class="stat-row"><span>Records</span><span class="stat-val">${stat.records}</span></div>
<div class="stat-row"><span>File size</span><span class="stat-val">${stat.size_kb} KB</span></div>
<div class="stat-row"><span>Updated</span><span class="stat-val">${stat.updated}</span></div>
<div style="margin-top:6px">${Object.entries(stat.by_type||{}).map(([t,n])=>badge(t,n)).join('')}</div>`;
    }else if(stat&&stat.error){
      inner=`<div class="stat-row"><span style="color:#f87171">${stat.error}</span></div>`;
    }else{
      inner=`<div class="no-data">No data scraped yet</div>`;
    }
    return `<div class="card">
<div class="card-head"><div class="dot ${dot}"></div><div class="card-name">${s.name}</div>
${s.enabled?`<button class="btn-sm" style="margin-left:auto" onclick="runSite('${s.key}')">Run</button>`:''}
</div>
<div class="card-url">${s.base_url}</div>
${inner}
</div>`;
  }).join('');
}

async function loadStatus(){
  try{
    const r = await fetch('/api/status');
    const d = await r.json();
    renderCards(d);
    const sel = document.getElementById('site-sel');
    const cur = sel.value;
    while(sel.options.length>1) sel.remove(1);
    (d.sites||[]).filter(s=>s.enabled).forEach(s=>{
      const o = new Option(s.name, s.key); sel.add(o);
    });
    if(cur) sel.value=cur;
    document.getElementById('ts').textContent='Updated '+ts();
  }catch(e){}
}

function appendLog(line){
  const box = document.getElementById('log-box');
  if(logLines.length===0) box.innerHTML='';
  logLines.push(line);
  const p = document.createElement('p');
  const cls = line.startsWith('[ERROR]')||line.includes('Error')?'err':
              line.startsWith('---')?'head':
              line.startsWith('[')?'ok':'';
  if(cls) p.className=cls;
  p.textContent=line;
  box.appendChild(p);
  box.scrollTop=box.scrollHeight;
}

function startRun(){
  const site = document.getElementById('site-sel').value;
  const split = document.getElementById('split-toggle').checked;
  const limit = document.getElementById('limit-in').value;
  runSite(site||null, split, limit?parseInt(limit):null);
}

function runSite(key, split, limit){
  if(esSource){esSource.close();esSource=null;}
  logLines=[];
  document.getElementById('log-box').innerHTML='';
  document.getElementById('run-btn').disabled=true;
  document.getElementById('status-bar').innerHTML='<span class="spinner"></span> Scraper running…';
  const sp = split!==undefined ? split : document.getElementById('split-toggle').checked;
  const lm = limit||document.getElementById('limit-in').value;
  const params = new URLSearchParams();
  if(key) params.set('site',key);
  params.set('split',sp);
  if(lm) params.set('limit',lm);
  fetch('/api/run?'+params.toString(),{method:'POST'});
  esSource = new EventSource('/api/logs');
  esSource.onmessage = e=>{
    const d = JSON.parse(e.data);
    if(d.type==='line') appendLog(d.text);
    if(d.type==='done'){
      esSource.close();esSource=null;
      document.getElementById('run-btn').disabled=false;
      document.getElementById('status-bar').innerHTML='&#10003; Scraper finished — '+ts();
      loadStatus();
    }
    if(d.type==='timeout'){
      esSource.close();esSource=null;
      document.getElementById('run-btn').disabled=false;
      document.getElementById('status-bar').innerHTML='&#9888; No output received — check console.';
    }
  };
}
setInterval(loadStatus,15000);
loadStatus();
</script>
</body>
</html>"""


@app.route("/")
def index():
    return render_template_string(PAGE)


@app.route("/api/status")
def api_status():
    config = load_config()
    combined_path, split_dir = resolve_paths(config)
    result = []

    for site in config.get("sites", []):
        split_file = split_dir / f"{site['key']}.json"
        stats = file_stats(split_file) if split_file.exists() else file_stats(combined_path)

        if not split_file.exists() and combined_path.exists():
            try:
                data = json.loads(combined_path.read_text(encoding="utf-8"))
                records = [r for r in data if r.get("source_site") == site["key"]]
                if records:
                    by_type: dict = {}
                    for r in records:
                        ct = r.get("content_type", "movie")
                        by_type[ct] = by_type.get(ct, 0) + 1
                    mtime = datetime.fromtimestamp(combined_path.stat().st_mtime).strftime("%Y-%m-%d %H:%M")
                    stats = {
                        "exists": True, "records": len(records),
                        "size_kb": round(combined_path.stat().st_size / 1024, 1),
                        "updated": mtime, "by_type": by_type,
                        "note": "from combined Movi.json",
                    }
            except Exception:
                pass

        result.append({
            "key": site["key"],
            "name": site["name"],
            "base_url": site["base_url"],
            "enabled": site.get("enabled", False),
            "stats": stats,
        })

    return jsonify({"sites": result})


@app.route("/api/run", methods=["POST"])
def api_run():
    site_key = request.args.get("site") or None
    split = request.args.get("split", "false").lower() == "true"
    limit_raw = request.args.get("limit")
    limit = int(limit_raw) if limit_raw and limit_raw.isdigit() else None
    run_scraper(site_key, split, limit)
    return jsonify({"started": True})


@app.route("/api/logs")
def api_logs():
    def generate():
        sent = 0
        waited = 0
        max_wait = 60  # seconds before timeout if nothing happens
        while True:
            with _lock:
                buf = _log_buffer[:]
                running = _running
            new_lines = buf[sent:]
            for line in new_lines:
                yield f"data: {json.dumps({'type': 'line', 'text': line})}\n\n"
                sent += 1
                waited = 0  # reset idle counter
            if not running and sent >= len(buf) and sent > 0:
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
                break
            time.sleep(0.3)
            waited += 0.3
            if waited > max_wait:
                yield f"data: {json.dumps({'type': 'timeout'})}\n\n"
                break

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.route("/api/data/<site_key>")
def api_data(site_key: str):
    config = load_config()
    _, split_dir = resolve_paths(config)
    path = split_dir / f"{site_key}.json"
    if not path.exists():
        return jsonify({"error": "not found"}), 404
    return Response(path.read_bytes(), mimetype="application/json")


if __name__ == "__main__":
    print("=" * 55)
    print("  Movi Scraper Dashboard")
    print("  http://localhost:5050")
    print("=" * 55)
    app.run(host="0.0.0.0", port=5050, debug=False, threaded=True)
