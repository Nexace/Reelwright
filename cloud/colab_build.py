# Build a reelwright film in a fresh Linux VM (Google Colab, or CI), keeping the slow parts in a Drive folder.
# cloud/reelwright_colab.ipynb calls these; outside Colab, DRIVE is any folder (REELWRIGHT_DRIVE).
#
#   DRIVE/cache/     node tarball, Playwright browsers as a tarball, pip and npm caches (survive the VM)
#   DRIVE/projects/<name>/   your project in; the whole project, its caches and out/ back after every step
#
# Resume: rerun build() after a disconnect. `record` is skipped when the take is already there (a new take would
# change every frame), vo reuses its line cache, pvk frames come from .cache/frames/; cheap steps just rerun.
# shortcut: HyperFrames films re-render every frame on resume (its producer has no frame cache); fine while they're short.
import json, os, shutil, subprocess, sys, tarfile, time, urllib.request

NODE = "v22.20.0"
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV = dict(os.environ, PYTHONUTF8="1", PLAYWRIGHT_BROWSERS_PATH=os.path.join(REPO, ".ms-playwright"))


def sh(cmd, check=True, log=None):
    """Run cmd in the repo, streaming its output (and copying it to log, a file path)."""
    print("$", " ".join(cmd), flush=True)
    p = subprocess.Popen(cmd, cwd=REPO, env=ENV, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    lines = []
    for line in p.stdout:
        print(line, end="", flush=True); lines.append(line)
    p.wait()
    if log:
        os.makedirs(os.path.dirname(log), exist_ok=True)
        open(log, "w").writelines(lines)
    if check and p.returncode:
        raise RuntimeError(f"{cmd[0]} … failed (exit {p.returncode})")
    return p.returncode


def tools(drive):
    """Node 22, Python libs, npm packages and Chromium; downloads land in DRIVE/cache once, later runs unpack."""
    cache = os.path.join(drive, "cache"); os.makedirs(cache, exist_ok=True)
    t0 = time.time()
    ENV.update(PIP_CACHE_DIR=os.path.join(cache, "pip"), npm_config_cache=os.path.join(cache, "npm"))
    have = subprocess.run(["node", "--version"], capture_output=True, text=True, env=ENV).stdout.strip()
    if not have.startswith(("v22", "v23", "v24", "v25", "v26")):
        tgz = os.path.join(cache, f"node-{NODE}-linux-x64.tar.xz")
        if not os.path.exists(tgz):
            urllib.request.urlretrieve(f"https://nodejs.org/dist/{NODE}/node-{NODE}-linux-x64.tar.xz", tgz + ".part")
            os.replace(tgz + ".part", tgz)
        dest = os.path.join(REPO, ".node")
        if not os.path.isdir(dest):
            with tarfile.open(tgz) as t: t.extractall(dest)
        ENV["PATH"] = os.path.join(dest, f"node-{NODE}-linux-x64", "bin") + os.pathsep + ENV["PATH"]
    sh([sys.executable, "-m", "pip", "install", "-q", "-r", "requirements.txt"])
    sh(["npm", "install", "--no-audit", "--no-fund", "--loglevel=error"])
    # browsers: unpacked on local disk (executables don't run reliably from Drive's FUSE mount), tarball kept in Drive
    tb = os.path.join(cache, "ms-playwright.tar")
    if not os.path.isdir(ENV["PLAYWRIGHT_BROWSERS_PATH"]) and os.path.exists(tb):
        with tarfile.open(tb) as t: t.extractall(REPO)
    sh(["npx", "playwright", "install", "chromium"])   # no-op when the unpacked browsers match
    if not os.path.exists(tb):
        with tarfile.open(tb + ".part", "w") as t: t.add(ENV["PLAYWRIGHT_BROWSERS_PATH"], ".ms-playwright")
        os.replace(tb + ".part", tb)
    if sys.platform == "linux" and os.geteuid() == 0:
        sh(["npx", "playwright", "install-deps", "chromium"])   # system libraries; Colab runs as root
    sh(["ffmpeg", "-version"], check=False)
    sh(["node", "tools/smoke.mjs"])
    print(f"tools ready in {time.time() - t0:.0f}s")


def rsync(src, dst):
    os.makedirs(dst, exist_ok=True)
    # frames/ is rebuilt from .cache/frames/ (pvk) on resume, so Drive keeps the cache, not the frame dump
    sh(["rsync", "-a", "--exclude", "/frames/", "--exclude", "/frames-*/", "--exclude", "/stills*/",
        "--exclude", "/hf/kit/", src.rstrip("/") + "/", dst])


def build(drive, name, args=()):
    """Run `reelwright all` step by step for projects/<name> (from DRIVE/projects/<name> if it's there), copying
    the project back to Drive after each step. Returns the qa exit code (0 = every gate passed)."""
    here, there = os.path.join(REPO, "projects", name), os.path.join(drive, "projects", name)
    if os.path.isdir(there): rsync(there, here)
    if not os.path.isdir(here): sys.exit(f"no project {name}: put it in {there}")
    P = json.load(open(os.path.join(here, "project.json")))
    track = P.get("music", {}).get("file") and os.path.exists(os.path.join(here, P["music"]["file"]))
    cli = lambda step, **kw: sh(["node", "bin/reelwright.mjs", step, name, *args], **kw)
    for step in ("record", "vo", "beatgrid", "sched", "info", "music", "mix", "frames", "encode", "qa"):
        t0 = time.time()
        if step == "record" and os.path.isdir(os.path.join(here, "clips")) and os.path.exists(os.path.join(here, "film/clip.js")):
            print("▶ record: skipped, the take is already there (delete clips/ to record again)"); continue
        if step == "beatgrid" and not track: continue
        if step == "qa":
            code = cli("qa", check=False, log=os.path.join(here, "out", "qa.txt"))
        else:
            cli(step)
        rsync(here, there)
        print(f"  ({step} {time.time() - t0:.0f}s, saved to Drive)", flush=True)
    print(f"\n{'✔ all gates passed' if code == 0 else '✘ some qa gates failed (see out/qa.txt)'} → {os.path.join(there, 'out')}")
    return code
