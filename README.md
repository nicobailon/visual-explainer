<p>
  <img src="banner.png" alt="visual-explainer" width="1100">
</p>

# visual-explainer

**An agent skill that turns complex terminal output into styled HTML pages you actually want to read.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

Ask your agent to explain a system architecture, review a diff, or compare requirements against a plan. Instead of ASCII art and box-drawing tables, it generates a self-contained HTML page and opens it in your browser:

```
> draw a diagram of our authentication flow
> /diff-review
> /plan-review ~/docs/refactor-plan.md
```

Each one produces a single `.html` file with real typography, dark/light theme support, and interactive Mermaid diagrams with zoom and pan. No build step, no dependencies beyond a browser.

https://github.com/user-attachments/assets/55ebc81b-8732-40f6-a4b1-7c3781aa96ec

## Why

Every coding agent defaults to ASCII art when you ask for a diagram. Box-drawing characters, monospace alignment hacks, text arrows. It works for trivial cases, but anything beyond a 3-box flowchart turns into an unreadable mess that nobody would put in a presentation or share with a team.

Tables are worse. Ask the agent to compare 15 requirements against a plan and you get a wall of pipes and dashes that wraps and breaks in the terminal. The data is there but it's painful to read.

## Install

```bash
# Pi — installs the skill and all slash commands in one step
pi install https://github.com/nicobailon/visual-explainer
```

For Claude Code or other agents, clone into your skills directory:

```bash
git clone https://github.com/nicobailon/visual-explainer.git ~/.claude/skills/visual-explainer
```

If you have [surf-cli](https://github.com/nicobailon/surf-cli) installed, the skill can also generate illustrations via Gemini and embed them in pages. The agent detects surf automatically and skips image generation if it's not there.

## Usage

The agent loads the skill when you mention diagrams, architecture, flowcharts, schemas, or visualizations. It also kicks in automatically when it's about to dump a complex table in the terminal (4+ rows or 3+ columns) — it renders HTML instead and opens it in the browser. Output goes to `~/.agent/diagrams/`.

The skill ships with five prompt templates:

| Command | What it does |
|---------|-------------|
| `/generate-web-diagram` | Generate an HTML diagram for any topic |
| `/diff-review` | Visual diff review with architecture comparison, code review, decision log |
| `/plan-review` | Compare a plan against the codebase with risk assessment |
| `/project-recap` | Mental model snapshot for context-switching back to a project |
| `/fact-check` | Verify accuracy of a review page or plan doc against actual code |

### `--quick` mode (preserves default behavior)

Default behavior is unchanged: full one-shot HTML generation.

When you add `--quick` to `/generate-web-diagram`, the skill uses a static renderer pipeline:
1. Model emits compact JSON spec
2. `quick/render-architecture.mjs` assembles HTML
3. If quick render fails, it falls back to the original full-generation path

Example:

```
/generate-web-diagram --quick architecture overview of our rpc layer
```

`/diff-review` is probably the most useful. Run it with no arguments to diff against `main`, or pass any git ref:

```
/diff-review                   # feature branch vs main (default)
/diff-review abc123            # single commit
/diff-review main..HEAD        # committed changes only
/diff-review #42               # pull request
```

It generates a full page with before/after architecture diagrams, KPI dashboard, structured Good/Bad/Ugly code review, decision log with confidence indicators, and re-entry context for your future self.

`/plan-review` does something similar but for implementation plans — pass it a plan file and it cross-references every claim against the actual codebase, produces current vs. planned architecture diagrams, and flags risks and gaps:

```
/plan-review ~/docs/refactor-plan.md
```

`/project-recap` is designed for context-switching back to a project after days away. It scans recent git activity and produces an architecture snapshot, decision log, and cognitive debt hotspots. `/fact-check` takes any document that makes claims about code and verifies every one of them.

## How It Works

```
SKILL.md (workflow + design principles)
    ↓
references/           ← agent reads before each generation
├── css-patterns.md   (layouts, animations, theming, depth tiers)
├── libraries.md      (Mermaid theming, Chart.js, anime.js, font pairings)
└── responsive-nav.md (sticky sidebar TOC for multi-section pages)
    ↓
templates/            ← agent reads the matching reference template
├── architecture.html (CSS Grid cards — terracotta/sage palette)
├── mermaid-flowchart.html (Mermaid + ELK — teal/cyan palette)
└── data-table.html   (tables with KPIs and badges — rose/cranberry palette)
    ↓
~/.agent/diagrams/filename.html → opens in browser
```

The agent picks an aesthetic direction, reads the right reference template, generates a self-contained HTML file with both light and dark themes, and opens it. The three templates use deliberately different palettes so the agent learns variety rather than defaulting to one look. The skill handles 11 diagram types — Mermaid for anything with connections (flowcharts, sequences, ER, state machines, mind maps), CSS Grid for text-heavy architecture overviews, HTML tables for data, Chart.js for dashboards — and routes to the right approach automatically.

To customize the output directory, browser command, or add your own diagram types and CSS patterns, edit the files directly. The agent reads them fresh each time.

## Limitations

- Requires a browser to view — no inline terminal rendering
- Switching OS theme requires a page refresh for Mermaid SVGs (CSS-styled elements respond instantly)
- Results vary by model capability — the skill provides design guidance, not pixel-perfect specs

## Credits

Borrows ideas from [Anthropic's frontend-design skill](https://github.com/anthropics/skills) and [interface-design](https://github.com/Dammyjay93/interface-design), adapted for one-shot diagram generation.

## License

MIT
