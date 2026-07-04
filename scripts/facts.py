#!/usr/bin/env python3
"""facts.py — project fact ledger for visual-explainer decks.

A ledger is JSONL: one fact per line:
  {"id":"lcb-lite","claim":"liver32lite LCB /100","value":"70/100",
   "source":"lcb_subset_async_any.py output json","ts":"2026-07-01T16:00Z",
   "status":"real"}          # real | void | superseded | illustrative

Decks reference facts with data-fact="id" on any element.

Usage:
  facts.py add    <ledger> --id X --claim "..." --value "..." --source "..." [--status real]
  facts.py void   <ledger> --id X --reason "..."
  facts.py list   <ledger> [--status real]
  facts.py verify <ledger> deck1.html [deck2.html ...]   # flag decks citing void/missing facts
"""
import argparse
import datetime
import json
import re
import sys
from pathlib import Path


def load(ledger: Path) -> dict:
    facts = {}
    if ledger.exists():
        for line in ledger.read_text().splitlines():
            if line.strip():
                f = json.loads(line)
                facts[f["id"]] = f  # last write wins
    return facts


def append(ledger: Path, fact: dict) -> None:
    fact["ts"] = fact.get("ts") or datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%MZ")
    with ledger.open("a") as fh:
        fh.write(json.dumps(fact, ensure_ascii=False) + "\n")


def cmd_add(a):
    append(Path(a.ledger), {"id": a.id, "claim": a.claim, "value": a.value,
                            "source": a.source, "status": a.status})
    print(f"added {a.id} [{a.status}]")


def cmd_void(a):
    ledger = Path(a.ledger)
    facts = load(ledger)
    if a.id not in facts:
        sys.exit(f"no such fact: {a.id}")
    f = dict(facts[a.id])
    f["status"] = "void"
    f["reason"] = a.reason
    f.pop("ts", None)
    append(ledger, f)
    print(f"voided {a.id}: {a.reason}")


def cmd_list(a):
    for f in load(Path(a.ledger)).values():
        if a.status and f["status"] != a.status:
            continue
        mark = {"real": "✓", "void": "✗", "superseded": "↻", "illustrative": "~"}.get(f["status"], "?")
        print(f"{mark} {f['id']:26s} {f['value']:>16s}  {f['claim']}  [{f['status']}]"
              + (f"  reason: {f.get('reason')}" if f.get("reason") else ""))


def cmd_verify(a):
    facts = load(Path(a.ledger))
    bad = 0
    for deck in a.decks:
        s = Path(deck).read_text()
        ids = re.findall(r'data-fact="([^"]+)"', s)
        print(deck)
        if not ids:
            print("  (no data-fact references)")
        for i in ids:
            f = facts.get(i)
            if not f:
                print(f"  FAIL  {i}: not in ledger"); bad += 1
            elif f["status"] in ("void", "superseded"):
                print(f"  FAIL  {i}: status={f['status']}" + (f" ({f.get('reason','')})" if f.get("reason") else "")); bad += 1
            else:
                print(f"  PASS  {i} = {f['value']} [{f['status']}]")
    print("\nRESULT:", "ALL PASS" if bad == 0 else f"{bad} FAILURES")
    return 0 if bad == 0 else 1


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    for name, fn in [("add", cmd_add), ("void", cmd_void), ("list", cmd_list), ("verify", cmd_verify)]:
        sp = sub.add_parser(name)
        sp.add_argument("ledger")
        sp.set_defaults(fn=fn)
        if name == "add":
            sp.add_argument("--id", required=True); sp.add_argument("--claim", required=True)
            sp.add_argument("--value", required=True); sp.add_argument("--source", required=True)
            sp.add_argument("--status", default="real")
        elif name == "void":
            sp.add_argument("--id", required=True); sp.add_argument("--reason", required=True)
        elif name == "list":
            sp.add_argument("--status")
        elif name == "verify":
            sp.add_argument("decks", nargs="+")
    a = p.parse_args()
    rc = a.fn(a)
    sys.exit(rc or 0)


if __name__ == "__main__":
    main()
