#!/bin/zsh
set -euo pipefail

GROUP_DIR="$HOME/Library/Group Containers/group.com.liguangming.Shadowrocket"
PREF="$GROUP_DIR/Library/Preferences/group.com.liguangming.Shadowrocket.plist"
SERVER_MANAGER="$GROUP_DIR/ServerManager"
PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
BACKUP_DIR="$PROJECT_DIR/backups/shadowrocket"

usage() {
  cat <<'EOF'
Shadowrocket node control

Usage:
  shadowrocket-node-control.command current
  shadowrocket-node-control.command list [filter]
  shadowrocket-node-control.command probe [filter]
  shadowrocket-node-control.command probe-target <index|uuid|name-fragment>
  shadowrocket-node-control.command check
  shadowrocket-node-control.command resolve <index|uuid|name-fragment>
  shadowrocket-node-control.command switch <index|uuid|name-fragment>

probe only tests TCP host:port entry connectivity. It does not switch nodes.
check tests whether the current active route can reach key services. It does not switch nodes.
switch changes Shadowrocket's selected server preference, then restarts the VPN.
EOF
}

if [[ $# -lt 1 ]]; then
  usage
  exit 0
fi

python3 - "$@" "$PREF" "$SERVER_MANAGER" "$BACKUP_DIR" <<'PY'
import json
import os
import pathlib
import plistlib
import socket
import shutil
import subprocess
import sys
import time
import urllib.request
import ssl
from concurrent.futures import ThreadPoolExecutor, as_completed

args = sys.argv[1:-3]
pref_path = pathlib.Path(sys.argv[-3])
server_path = pathlib.Path(sys.argv[-2])
backup_dir = pathlib.Path(sys.argv[-1])

SELECTED_NAME = "group.com.liguangming.SelectedServerName"
SELECTED_UUID = "group.com.liguangming.SelectedServerUUID"

def run(command, allow_failure=False):
    proc = subprocess.run(command, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if proc.returncode and not allow_failure:
        raise SystemExit(f"{' '.join(command)} failed:\n{proc.stdout.strip()}")
    return proc.stdout.strip()

def load_pref():
    with pref_path.open("rb") as fh:
        return plistlib.load(fh)

def save_pref(pref):
    pref_path.parent.mkdir(parents=True, exist_ok=True)
    with pref_path.open("wb") as fh:
        plistlib.dump(pref, fh, fmt=plistlib.FMT_BINARY)

def load_nodes():
    with server_path.open("rb") as fh:
        root = plistlib.load(fh)
    objects = root["$objects"]

    def val(value):
        if isinstance(value, plistlib.UID):
            return val(objects[value.data])
        if isinstance(value, dict) and "NS.string" in value:
            return value["NS.string"]
        return value

    nodes = []
    for obj in objects:
        if isinstance(obj, dict) and "title" in obj and "uuid" in obj:
            title = val(obj.get("title"))
            uuid = val(obj.get("uuid"))
            if not title or not uuid:
                continue
            nodes.append({
                "title": title,
                "uuid": uuid,
                "type": val(obj.get("type")),
                "host": val(obj.get("host")),
                "port": val(obj.get("port")),
                "ping": val(obj.get("ping")),
            })
    return nodes

def print_current(pref, nodes):
    current_uuid = pref.get(SELECTED_UUID, "")
    current_name = pref.get(SELECTED_NAME, "")
    matches = [node for node in nodes if node["uuid"] == current_uuid]
    print(f"Current: {current_name} | {current_uuid}")
    if matches:
        node = matches[0]
        print(f"Matched: {node['title']} | {node['type']} | ping={node['ping']}")
    else:
        print("Matched: not found in ServerManager")

def print_list(nodes, filter_text=""):
    f = filter_text.casefold()
    visible = [
        (index, node) for index, node in enumerate(nodes, 1)
        if not f or f in node["title"].casefold() or f in node["uuid"].casefold()
    ]
    print(f"Nodes: {len(visible)} / {len(nodes)}")
    for index, node in visible:
        print(f"{index:02d}. {node['title']} | {node['uuid']} | {node['type']} | ping={node['ping']}")

def filter_nodes(nodes, filter_text=""):
    f = str(filter_text or "").casefold()
    return [
        (index, node) for index, node in enumerate(nodes, 1)
        if not f or f in node["title"].casefold() or f in node["uuid"].casefold()
    ]

def find_node(nodes, target):
    target = str(target).strip()
    if target.isdigit():
        index = int(target)
        if 1 <= index <= len(nodes):
            return nodes[index - 1]
    exact_uuid = [node for node in nodes if node["uuid"].lower() == target.lower()]
    if exact_uuid:
        return exact_uuid[0]
    exact_name = [node for node in nodes if node["title"] == target]
    if exact_name:
        return exact_name[0]
    partial = [node for node in nodes if target.casefold() in node["title"].casefold()]
    if len(partial) == 1:
        return partial[0]
    if len(partial) > 1:
        print("Multiple nodes matched:")
        for node in partial[:20]:
            print(f"- {node['title']} | {node['uuid']} | ping={node['ping']}")
        raise SystemExit("Please use index or UUID.")
    raise SystemExit(f"Node not found: {target}")

def vpn_status():
    return run(["/usr/sbin/scutil", "--nc", "status", "Shadowrocket"], allow_failure=True).splitlines()[0:1]

def tcp_probe_one(index, node, timeout=2.0):
    host = str(node.get("host") or "").strip()
    port_raw = node.get("port")
    try:
        port = int(str(port_raw).strip())
    except Exception:
        return {
            "index": index,
            "node": node,
            "ok": False,
            "ms": None,
            "error": f"invalid port: {port_raw}",
        }
    if not host:
        return {
            "index": index,
            "node": node,
            "ok": False,
            "ms": None,
            "error": "missing host",
        }
    started = time.perf_counter()
    try:
        with socket.create_connection((host, port), timeout=timeout):
            pass
        elapsed = round((time.perf_counter() - started) * 1000)
        return {
            "index": index,
            "node": node,
            "ok": True,
            "ms": elapsed,
            "error": "",
        }
    except Exception as error:
        return {
            "index": index,
            "node": node,
            "ok": False,
            "ms": None,
            "error": str(error).splitlines()[0][:80],
        }

def probe_nodes(nodes, filter_text=""):
    visible = []
    for index, node in filter_nodes(nodes, filter_text):
        try:
            port = int(str(node.get("port") or "").strip())
        except Exception:
            port = 0
        host = str(node.get("host") or "").strip()
        if node.get("type") == "Subscribe" or port <= 0 or host.startswith(("http://", "https://")):
            continue
        visible.append((index, node))
    if not visible:
        print("No nodes matched.")
        return
    print(f"TCP entry probe: {len(visible)} node(s)")
    print("Only tests host:port connectivity, not proxy auth/TLS/outbound availability.")
    results = []
    with ThreadPoolExecutor(max_workers=8) as executor:
        future_map = {
            executor.submit(tcp_probe_one, index, node): (index, node)
            for index, node in visible
        }
        for future in as_completed(future_map):
            results.append(future.result())
    results.sort(key=lambda item: (not item["ok"], item["ms"] if item["ms"] is not None else 999999, item["index"]))
    for item in results:
        node = item["node"]
        if item["ok"]:
            status = f"{item['ms']}ms"
        else:
            status = f"FAIL {item['error']}"
        print(f"{item['index']:02d}. {node['title']} | {node.get('type')} | {node.get('host')}:{node.get('port')} | tcp={status} | srping={node.get('ping')}")

def probe_target(nodes, target):
    node = find_node(nodes, target)
    index = next((i for i, item in enumerate(nodes, 1) if item["uuid"] == node["uuid"]), None)
    item = tcp_probe_one(index or 0, node)
    if item["ok"]:
        status = f"{item['ms']}ms"
    else:
        status = f"FAIL {item['error']}"
    print("TCP entry probe: 1 node")
    print("Only tests host:port connectivity, not proxy auth/TLS/outbound availability.")
    print(f"{item['index']:02d}. {node['title']} | {node.get('type')} | {node.get('host')}:{node.get('port')} | tcp={status} | srping={node.get('ping')}")

def http_check_one(name, url, timeout=8.0, method="GET"):
    started = time.perf_counter()
    request = urllib.request.Request(
        url,
        method=method,
        headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
            "Accept": "*/*",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
        },
    )
    try:
        context = ssl.create_default_context()
        with urllib.request.urlopen(request, timeout=timeout, context=context) as response:
            response.read(4096)
            elapsed = round((time.perf_counter() - started) * 1000)
            return {
                "name": name,
                "ok": True,
                "status": response.status,
                "ms": elapsed,
                "error": "",
            }
    except urllib.error.HTTPError as error:
        elapsed = round((time.perf_counter() - started) * 1000)
        return {
            "name": name,
            "ok": True,
            "status": error.code,
            "ms": elapsed,
            "error": f"HTTP {error.code}",
        }
    except Exception as error:
        elapsed = round((time.perf_counter() - started) * 1000)
        return {
            "name": name,
            "ok": False,
            "status": None,
            "ms": elapsed,
            "error": str(error).splitlines()[0][:120],
        }

def check_current_route(pref, nodes):
    print_current(pref, nodes)
    print("")
    print("Route check: current active VPN/proxy path only. No node switching.")
    targets = [
        ("Google 204", "https://www.gstatic.com/generate_204", "GET"),
        ("YouTube 204", "https://www.youtube.com/generate_204", "GET"),
        ("OpenAI API", "https://api.openai.com/v1/models", "GET"),
        ("X Home", "https://x.com/", "GET"),
        ("Twitter image CDN", "https://pbs.twimg.com/", "GET"),
        ("Twitter video CDN", "https://video.twimg.com/", "GET"),
    ]
    results = []
    with ThreadPoolExecutor(max_workers=4) as executor:
        future_map = {
            executor.submit(http_check_one, name, url, 8.0, method): name
            for name, url, method in targets
        }
        for future in as_completed(future_map):
            results.append(future.result())
    order = {name: index for index, (name, _, _) in enumerate(targets)}
    results.sort(key=lambda item: order.get(item["name"], 999))
    for result in results:
        if result["ok"]:
            status = "OK" if result["status"] and 200 <= result["status"] < 400 else "REACHABLE"
            print(f"{result['name']}: {status} HTTP {result['status']} {result['ms']}ms")
        else:
            print(f"{result['name']}: FAIL {result['ms']}ms {result['error']}")

def resolve_node(nodes, target):
    node = find_node(nodes, target)
    index = next((i for i, item in enumerate(nodes, 1) if item["uuid"] == node["uuid"]), None)
    print(json.dumps({
        "index": index,
        "title": node.get("title"),
        "uuid": node.get("uuid"),
        "type": node.get("type"),
        "host": node.get("host"),
        "port": node.get("port"),
        "ping": node.get("ping"),
    }, ensure_ascii=False))

def switch_node(target):
    nodes = load_nodes()
    pref = load_pref()
    node = find_node(nodes, target)
    backup_dir.mkdir(parents=True, exist_ok=True)
    stamp = time.strftime("%Y%m%d-%H%M%S")
    backup = backup_dir / f"group.com.liguangming.Shadowrocket.{stamp}.plist"
    shutil.copy2(pref_path, backup)

    before_name = pref.get(SELECTED_NAME, "")
    before_uuid = pref.get(SELECTED_UUID, "")
    print(f"Backup: {backup}")
    print(f"Before: {before_name} | {before_uuid}")
    print(f"Target: {node['title']} | {node['uuid']}")

    print("Stopping VPN...")
    run(["/usr/sbin/scutil", "--nc", "stop", "Shadowrocket"], allow_failure=True)
    time.sleep(1.5)

    pref[SELECTED_NAME] = node["title"]
    pref[SELECTED_UUID] = node["uuid"]
    save_pref(pref)
    run(["/usr/bin/killall", "cfprefsd"], allow_failure=True)
    time.sleep(0.5)

    print("Starting VPN...")
    run(["/usr/sbin/scutil", "--nc", "start", "Shadowrocket"], allow_failure=True)
    time.sleep(3)

    after = load_pref()
    print(f"After pref: {after.get(SELECTED_NAME, '')} | {after.get(SELECTED_UUID, '')}")
    print(f"VPN status: {' '.join(vpn_status()) or 'unknown'}")

command = args[0]
nodes = load_nodes()
pref = load_pref()

if command == "current":
    print_current(pref, nodes)
elif command == "list":
    print_list(nodes, args[1] if len(args) > 1 else "")
elif command == "probe":
    probe_nodes(nodes, args[1] if len(args) > 1 else "")
elif command == "probe-target":
    if len(args) < 2:
        raise SystemExit("probe-target requires <index|uuid|name-fragment>")
    probe_target(nodes, args[1])
elif command == "check":
    check_current_route(pref, nodes)
elif command == "resolve":
    if len(args) < 2:
        raise SystemExit("resolve requires <index|uuid|name-fragment>")
    resolve_node(nodes, args[1])
elif command == "switch":
    if len(args) < 2:
        raise SystemExit("switch requires <index|uuid|name-fragment>")
    switch_node(args[1])
else:
    raise SystemExit(f"Unknown command: {command}")
PY
