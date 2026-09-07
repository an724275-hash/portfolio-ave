#!/usr/bin/env python3
"""Explicit Git, Docker and VPS publishing for the static portfolio."""
import argparse
import functools
import http.server
import json
from pathlib import Path
import re
import shlex
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
PUBLIC_FILES = ["index.html", "style.css", "script.js", "duck.js", "avatar.png",
                "channel-avatar.png", "robots.txt", "sitemap.xml", "CNAME",
                "assets", "stickers_json"]


def run(command):
    subprocess.run(command, cwd=ROOT, check=True)


def check_assets():
    missing = [name for name in PUBLIC_FILES if not (ROOT / name).exists()]
    if missing:
        raise ValueError("Missing public assets: " + ", ".join(missing))


def push_git():
    check_assets()
    staged = subprocess.check_output(
        ["git", "diff", "--cached", "--name-only"], cwd=ROOT, text=True).strip()
    if staged:
        raise ValueError("Commit or unstage existing staged changes before push-git.")
    branch = subprocess.check_output(
        ["git", "branch", "--show-current"], cwd=ROOT, text=True).strip()
    if not branch:
        raise ValueError("Cannot publish from detached HEAD.")
    run(["git", "add", "--", *PUBLIC_FILES])
    changed = subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=ROOT)
    if changed.returncode == 1:
        run(["git", "commit", "-m", "Update portfolio website"])
    elif changed.returncode != 0:
        raise RuntimeError("Could not inspect staged changes.")
    run(["git", "push", "origin", branch])
    print("Git push completed.")


def deploy_vps():
    check_assets()
    config = json.loads((ROOT / "deploy_config.json").read_text(encoding="utf-8"))
    host, user, path = config["vps_ip"], config["vps_user"], config["vps_path"]
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9.-]*", host):
        raise ValueError("Invalid VPS hostname.")
    if not re.fullmatch(r"[a-z_][a-z0-9_-]*", user):
        raise ValueError("Invalid SSH user.")
    if not re.fullmatch(r"/(?:[A-Za-z0-9_-]+/)*[A-Za-z0-9_-]+", path) or path in ["/root", "/home", "/var", "/var/www"]:
        raise ValueError("Use a dedicated absolute website directory.")
    target = user + "@" + host
    # Strict verification requires the server key to be trusted beforehand.
    run(["ssh", "-o", "StrictHostKeyChecking=yes", target,
         "mkdir -p -- " + shlex.quote(path)])
    run(["scp", "-o", "StrictHostKeyChecking=yes", "-r",
         *PUBLIC_FILES, target + ":" + path + "/"])
    print("Public files uploaded successfully. Verify the live site separately.")


def serve(port):
    class Handler(http.server.SimpleHTTPRequestHandler):
        def end_headers(self):
            self.send_header("Cache-Control", "no-store")
            super().end_headers()
    handler = functools.partial(Handler, directory=str(ROOT))
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), handler) as server:
        print(f"Preview: http://localhost:{port}", flush=True)
        server.serve_forever()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["check", "local-stage", "push-git", "deploy-vps", "build-docker"])
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    try:
        if args.command == "check":
            check_assets()
            print("All public files are present.")
        elif args.command == "local-stage":
            serve(args.port)
        elif args.command == "push-git":
            push_git()
        elif args.command == "deploy-vps":
            deploy_vps()
        elif args.command == "build-docker":
            check_assets()
            run(["docker", "build", "-t", "ave-dev-portfolio", "."])
    except (OSError, ValueError, RuntimeError, subprocess.CalledProcessError) as error:
        print("ERROR: " + str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
