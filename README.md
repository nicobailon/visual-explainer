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

**Claude Code (marketplace):**
```shell
/plugin marketplace add nicobailon/visual-explainer
/plugin install visual-explainer@visual-explainer-marketplace
```

Note: Claude Code plugins namespace commands as `/visual-explainer:command-name`.

**Pi:**
```bash
curl -fsSL https://raw.githubusercontent.com/nicobailon/visual-explainer/main/install-pi.sh | bash
```

Or clone and run:
```bash
git clone --depth 1 https://github.com/nicobailon/visual-explainer.git
cd visual-explainer && ./install-pi.sh
```

**OpenAI Codex:**
```bash
git clone --depth 1 https://github.com/nicobailon/visual-explainer.git /tmp/visual-explainer

# Install skill
cp -r /tmp/visual-explainer/plugins/visual-explainer ~/.agents/skills/visual-explainer

# Optional: Install slash commands (deprecated, but works)
mkdir -p ~/.codex/prompts
cp /tmp/visual-explainer/plugins/visual-explainer/commands/*.md ~/.codex/prompts/

rm -rf /tmp/visual-explainer
```

Invoke with `$visual-explainer` or let Codex activate it implicitly. With prompts installed, use `/prompts:diff-review`, `/prompts:plan-review`, etc.

## Commands

| Command | What it does |
|---------|-------------|
| `/generate-web-diagram` | Generate an HTML diagram for any topic |
| `/generate-visual-plan` | Generate a visual implementation plan for a feature or extension |
| `/generate-slides` | Generate a magazine-quality slide deck |
| `/diff-review` | Visual diff review with architecture comparison and code review |
| `/plan-review` | Compare a plan against the codebase with risk assessment |
| `/project-recap` | Mental model snapshot for context-switching back to a project |
| `/fact-check` | Verify accuracy of a document against actual code |
| `/share` | Deploy an HTML page to Vercel and get a live URL |

The agent also kicks in automatically when it's about to dump a complex table in the terminal (4+ rows or 3+ columns) — it renders HTML instead.

## Slide Deck Mode

Any command that produces a scrollable page supports `--slides` to generate a slide deck instead:

```
/diff-review --slides
/project-recap --slides 2w
```

https://github.com/user-attachments/assets/342d3558-5fcf-4fb2-bc03-f0dd5b9e35dc

## Themes

You can set a preferred color palette so every generated page uses consistent colors. Create a config file in your project:

```bash
# .claude/visual-explainer.local.md
---
theme: dracula
---
```

The agent reads this file and applies the theme's colors instead of picking its own. Fonts, layout, and animations are still chosen freely — only the color palette is fixed.

**Available themes:**

| Theme | Style | Primary mode |
|-------|-------|-------------|
| `dracula` | Purple/pink/cyan on cool dark | Dark |
| `nord` | Arctic frost blues with aurora accents | Dark |
| `one-dark` | Atom's blue/green/purple palette | Dark |
| `catppuccin-mocha` | Soothing pastels on warm dark | Dark |
| `tokyo-night` | Downtown Tokyo blues and purples | Dark |
| `gruvbox-dark` | Retro groove warm oranges and greens | Dark |
| `synthwave-84` | Neon pink/cyan/yellow on deep purple | Dark |
| `solarized-light` | Ethan Schoonover's precise CIELAB palette | Light |
| `github-light` | GitHub Primer clean blues and greens | Light |
| `catppuccin-latte` | Soothing pastels on warm light | Light |
| `gruvbox-light` | Retro groove faded earth tones | Light |

Every theme includes both light and dark mode support via `prefers-color-scheme`. Every generated page includes an interactive theme picker with all 11 themes.

**Adding custom themes:** Create a new file in `themes/<name>.md` following the same structure as existing themes. Define CSS custom properties (using the same variable names) and Mermaid themeVariables.

## How It Works

```
.claude-plugin/
├── plugin.json           ← marketplace identity
└── marketplace.json      ← plugin catalog
plugins/
└── visual-explainer/
    ├── .claude-plugin/
    │   └── plugin.json   ← plugin manifest
    ├── SKILL.md           ← workflow + design principles
    ├── commands/          ← slash commands
    ├── references/        ← agent reads before generating
    │   ├── css-patterns.md   (layouts, animations, theming)
    │   ├── libraries.md      (Mermaid, Chart.js, fonts)
    │   ├── responsive-nav.md (sticky TOC for multi-section pages)
    │   └── slide-patterns.md (slide engine, transitions, presets)
    ├── themes/            ← 11 pre-built color themes
    │   ├── dracula.md, nord.md, one-dark.md, ...
    │   └── (add custom themes here)
    ├── templates/         ← reference templates with different palettes
    │   ├── architecture.html
    │   ├── mermaid-flowchart.html
    │   ├── data-table.html
    │   └── slide-deck.html
    └── scripts/
        └── share.sh       ← deploy HTML to Vercel for sharing
```

**Output:** `~/.agent/diagrams/filename.html` → opens in browser

The skill routes to the right approach automatically: Mermaid for flowcharts and diagrams, CSS Grid for architecture overviews, HTML tables for data, Chart.js for dashboards.

## Limitations

- Requires a browser to view
- Results vary by model capability

## Credits

Borrows ideas from [Anthropic's frontend-design skill](https://github.com/anthropics/skills) and [interface-design](https://github.com/Dammyjay93/interface-design).

## License

MIT
