#!/usr/bin/env python3
import argparse, os, shutil, subprocess, sys, tempfile
from pathlib import Path

DEFAULT_REMOTE = "git@github.com:HakunaMaruna/pokecode-mobile.git"

def run(args, cwd=None, check=False, capture=False, timeout=600):
    return subprocess.run(args, cwd=cwd, capture_output=capture, text=True, timeout=timeout)

def files_in(d):
    out = []
    for root, dirs, files in os.walk(d):
        dirs[:] = [x for x in dirs if x not in (".git","node_modules","__pycache__",".venv")]
        for f in files: out.append(os.path.relpath(os.path.join(root,f), d))
    return sorted(out)

def main():
    ap = argparse.ArgumentParser(description="PokeCode project sync (mobile -> PC)")
    ap.add_argument("--push", action="store_true")
    ap.add_argument("remote", nargs="?", default=None)
    args = ap.parse_args()
    remote = args.remote or os.environ.get("POKECODE_SYNC_REMOTE") or DEFAULT_REMOTE
    workspace = Path(os.environ.get("POKECODE_WORKSPACE", Path.home()/".pokecode"/"projects")).resolve()
    workspace.mkdir(parents=True, exist_ok=True)
    print(f"[sync] workspace={workspace} remote={remote}")
    if args.push:
        ws = workspace
        if not (ws/".git").exists():
            run(["git","init"], cwd=ws, capture=True)
            run(["git","add","-A"], cwd=ws, capture=True)
            run(["git","commit","-m","PokeCode PC backup","--allow-empty"], cwd=ws, capture=True)
        run(["git","remote","add","sync",remote], cwd=ws, capture=True)
        r = run(["git","push","sync","main"], cwd=ws)
        print("[sync] push exit:", r.returncode)
        sys.exit(r.returncode)
    with tempfile.TemporaryDirectory() as tmp:
        r = run(["git","clone","--depth","1",remote,tmp])
        if r.returncode != 0:
            print("[sync] clone failed", file=sys.stderr); sys.exit(1)
        imported = 0
        for root, dirs, files in os.walk(tmp):
            dirs[:] = [d for d in dirs if d not in (".git","node_modules","__pycache__",".venv")]
            rel = os.path.relpath(root, tmp)
            if rel == ".": continue
            dest = workspace/rel
            dest.mkdir(parents=True, exist_ok=True)
            for f in files:
                src = os.path.join(root,f); dst = dest/f
                if not dst.exists() or open(src,'rb').read() != open(dst,'rb').read():
                    shutil.copy2(src,dst); imported += 1
        print(f"[sync] imported {imported} files into {workspace}")

if __name__ == "__main__":
    main()
