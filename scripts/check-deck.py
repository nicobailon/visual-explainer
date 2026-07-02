#!/usr/bin/env python3
"""check-deck: quality gate for generated visual-explainer HTML.

Usage: check-deck.py file.html [file2.html ...]
Exit 0 = all pass. Prints one line per check per file.
"""
import re
import sys

FAVICON = 'rel="icon"'


def check(path: str) -> bool:
    s = open(path, encoding="utf-8").read()
    ok = True

    def r(name, passed, detail=""):
        nonlocal ok
        ok = ok and passed
        print(f"  {'PASS' if passed else 'FAIL'}  {name}" + (f"  ({detail})" if detail and not passed else ""))

    # 1. complete document
    r("complete html", s.lstrip().lower().startswith("<!doctype html") and "</html>" in s)
    # 2. favicon right after title
    r("favicon", FAVICON in s and "</title>" in s)
    # 3. title + viewport
    r("title+viewport", "<title>" in s and 'name="viewport"' in s)
    # 4. raw '<' inside <code> blocks (must be &lt;) — spans allowed
    bad = 0
    for b in re.findall(r"<code>(.*?)</code>", s, re.S):
        t = re.sub(r"</?span[^>]*>", "", b)
        bad += len(re.findall(r"<(?!span|/)", t))
    r("code-block escapes", bad == 0, f"{bad} raw '<' in <code>")
    # 5. raw '<' inside $$...$$ math (KaTeX truncation bug)
    m = [x for x in re.findall(r"\$\$[^$]{1,400}\$\$", s) if re.search(r"<[^/]", x) and "&lt;" not in x]
    r("math escapes", not m, f"{len(m)} display-math with raw '<'")
    # 6. mermaid blocks: no raw '<' except <br>
    mer = sum(len(re.findall(r"<(?!br)", x)) for x in re.findall(r'<pre class="mermaid">(.*?)</pre>', s, re.S))
    r("mermaid escapes", mer == 0, f"{mer} raw '<' (non-br)")
    # 7. slide engine present if it's a deck
    is_deck = 'class="deck"' in s or "class='deck'" in s
    if is_deck:
        r("SlideEngine present", "SlideEngine" in s)
        r("resume-fix (no land-on-last)", "j<this.total-1" in s.replace(" ", ""))
        r("scroll-snap-stop", "scroll-snap-stop" in s)
        # 8. code blocks: badge labels need overflow:visible container
        if '<div class="code' in s or "class=\"code\"" in s:
            r("code badge overflow", "overflow:visible" in s.replace(" ", ""))
    # 9. no /*ENGINE*/ placeholder left behind
    r("no leftover placeholder", "/*ENGINE*/" not in s)
    return ok


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    all_ok = True
    for p in sys.argv[1:]:
        print(p)
        all_ok = check(p) and all_ok
    print("\nRESULT:", "ALL PASS" if all_ok else "FAILURES")
    return 0 if all_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
