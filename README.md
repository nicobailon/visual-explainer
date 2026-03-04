<p>
  <img src="banner.png" alt="visual-explainer" width="1100">
</p>

# visual-explainer

**An agent skill that turns complex terminal output into styled HTML pages you actually want to read.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

Ask your agent to explain a system architecture, review a diff, or compare requirements against a plan. Instead of ASCII art and box-drawing tables, it generates a self-contained HTML page and opens it in your browser.

```
> draw a diagram of our authentication flow
> /diff-review
> /plan-review ~/docs/refactor-plan.md
```

https://github.com/user-attachments/assets/55ebc81b-8732-40f6-a4b1-7c3781aa96ec

## Why

Every coding agent defaults to ASCII art when you ask for a diagram. Box-drawing characters, monospace alignment hacks, text arrows. It works for trivial cases, but anything beyond a 3-box flowchart turns into an unreadable mess.

Tables are worse. Ask the agent to compare 15 requirements against a plan and you get a wall of pipes and dashes that wraps and breaks in the terminal. The data is there but it's painful to read.

This skill fixes that. Real typography, dark/light themes, interactive Mermaid diagrams with zoom and pan. No build step, no dependencies beyond a browser.

## Install

**Claude Code (plugin — recommended):**
```bash
claude /plugin install --scope local https://github.com/nicobailon/visual-explainer
```

Or for development/testing:
```bash
claude --plugin-dir ./visual-explainer
```

**Pi:**
```bash
pi install https://github.com/nicobailon/visual-explainer
```

## Commands

| Command | What it does |
|---------|-------------|
| `/visual-explainer:generate-web-diagram` | Generate an HTML diagram for any topic |
| `/visual-explainer:generate-visual-plan` | Generate a visual implementation plan for a feature or extension |
| `/visual-explainer:generate-slides` | Generate a magazine-quality slide deck |
| `/visual-explainer:diff-review` | Visual diff review with architecture comparison and code review |
| `/visual-explainer:plan-review` | Compare a plan against the codebase with risk assessment |
| `/visual-explainer:project-recap` | Mental model snapshot for context-switching back to a project |
| `/visual-explainer:fact-check` | Verify accuracy of a document against actual code |

The agent also kicks in automatically when it's about to dump a complex table in the terminal (4+ rows or 3+ columns) — it renders HTML instead.

## Slide Deck Mode

Any command that produces a scrollable page supports `--slides` to generate a slide deck instead:

```
/visual-explainer:diff-review --slides
/visual-explainer:project-recap --slides 2w
```

https://github.com/user-attachments/assets/342d3558-5fcf-4fb2-bc03-f0dd5b9e35dc

## How It Works

```
.claude-plugin/
└── plugin.json       ← plugin manifest
skills/
└── visual-explainer/
    └── SKILL.md      ← workflow + design principles
commands/             ← slash commands
├── diff-review.md
├── fact-check.md
├── generate-slides.md
├── generate-visual-plan.md
├── generate-web-diagram.md
├── plan-review.md
└── project-recap.md
references/           ← agent reads before generating
├── css-patterns.md   (layouts, animations, theming)
├── libraries.md      (Mermaid, Chart.js, fonts)
├── responsive-nav.md (sticky TOC for multi-section pages)
└── slide-patterns.md (slide engine, transitions, presets)
templates/            ← reference templates with different palettes
├── architecture.html
├── mermaid-flowchart.html
├── data-table.html
└── slide-deck.html
    ↓
~/.agent/diagrams/filename.html → opens in browser
```

The skill routes to the right approach automatically: Mermaid for flowcharts and diagrams, CSS Grid for architecture overviews, HTML tables for data, Chart.js for dashboards.

## Limitations

- Requires a browser to view
- Switching OS theme requires a page refresh for Mermaid SVGs
- Results vary by model capability

## Credits

Borrows ideas from [Anthropic's frontend-design skill](https://github.com/anthropics/skills) and [interface-design](https://github.com/Dammyjay93/interface-design).

## License

MIT
