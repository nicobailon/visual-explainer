<p>
  <img src="banner.png" alt="my-visual-explainer" width="1100">
</p>

# my-visual-explainer

**An agent skill that turns complex terminal output into styled HTML pages you actually want to read.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

Ask your agent to explain a system architecture, review a diff, or compare requirements against a plan. Instead of ASCII art and box-drawing tables, it generates a self-contained HTML page and opens it in your browser.

```
> draw a diagram of our authentication flow
> /diff-review
> /plan-review ~/docs/refactor-plan.md
```

https://github.com/user-attachments/assets/55ebc81b-8732-40f6-a4b1-7c3781aa96ec

## What's New in v0.7.0

### Theme Engine

Every generated page now includes a runtime theme engine. Switch palettes, toggle light/dark, swap background patterns, and export clean HTML — all without a page refresh.

![Overview](docs/screenshots/overview.png)

### 11 Theme Presets

Full light and dark palettes with Google Fonts hot-reload. Mermaid diagrams re-render automatically on every theme change.

![Theme presets](docs/screenshots/theme-presets.png)

### 16 Background Patterns

Dot grid, hex grid, blueprint, isometric, parchment, sketchbook, and more. All mode-aware — stronger opacity in light mode, subtler in dark.

![Background patterns](docs/screenshots/background-patterns.png)

### Share Button

Copy clean HTML to clipboard or download as `.html`. The export strips all interactive chrome (theme switcher, share button, background selector) and bakes the active theme into the CSS — recipients see exactly what you see.

### Test Coverage

Full manual test matrix covering all presets, patterns, modes, share functions, responsive behavior, and keyboard accessibility.

![Test matrix](docs/screenshots/test-matrix.png)

### Files Changed

![Files changed](docs/screenshots/files-changed.png)

## Why

Every coding agent defaults to ASCII art when you ask for a diagram. Box-drawing characters, monospace alignment hacks, text arrows. It works for trivial cases, but anything beyond a 3-box flowchart turns into an unreadable mess.

Tables are worse. Ask the agent to compare 15 requirements against a plan and you get a wall of pipes and dashes that wraps and breaks in the terminal. The data is there but it's painful to read.

This skill fixes that. Real typography, dark/light themes, interactive Mermaid diagrams with zoom and pan. No build step, no dependencies beyond a browser.

## Install

**Claude Code (marketplace):**
```shell
/plugin marketplace add jccidc/my-visual-explainer
/plugin install my-visual-explainer@my-visual-explainer-marketplace
```

Note: Claude Code plugins namespace commands as `/my-visual-explainer:command-name`.

**Pi:**
```bash
curl -fsSL https://raw.githubusercontent.com/jccidc/my-visual-explainer/main/install-pi.sh | bash
```

Or clone and run:
```bash
git clone --depth 1 https://github.com/jccidc/my-visual-explainer.git
cd my-visual-explainer && ./install-pi.sh
```

**OpenAI Codex:**
```bash
git clone --depth 1 https://github.com/jccidc/my-visual-explainer.git /tmp/my-visual-explainer

# Install skill
cp -r /tmp/my-visual-explainer/plugins/my-visual-explainer ~/.agents/skills/my-visual-explainer

# Optional: Install slash commands (deprecated, but works)
mkdir -p ~/.codex/prompts
cp /tmp/my-visual-explainer/plugins/my-visual-explainer/commands/*.md ~/.codex/prompts/

rm -rf /tmp/my-visual-explainer
```

Invoke with `$my-visual-explainer` or let Codex activate it implicitly. With prompts installed, use `/prompts:diff-review`, `/prompts:plan-review`, etc.

## Commands

| Command                 | What it does                                                          |
|-------------------------|-----------------------------------------------------------------------|
| `/generate-web-diagram` | Generate an HTML diagram for any topic                                |
| `/generate-visual-plan` | Generate a visual implementation plan for a feature or extension      |
| `/generate-slides`      | Generate a magazine-quality slide deck                                |
| `/diff-review`          | Visual diff review with architecture comparison and code review       |
| `/plan-review`          | Compare a plan against the codebase with risk assessment              |
| `/project-recap`        | Mental model snapshot for context-switching back to a project         |
| `/fact-check`           | Verify accuracy of a document against actual code                     |
| `/share`                | Deploy an HTML page to Vercel and get a live URL                      |

The agent also kicks in automatically when it's about to dump a complex table in the terminal (4+ rows or 3+ columns) — it renders HTML instead.

## Slide Deck Mode

Any command that produces a scrollable page supports `--slides` to generate a slide deck instead:

```
/diff-review --slides
/project-recap --slides 2w
```

https://github.com/user-attachments/assets/342d3558-5fcf-4fb2-bc03-f0dd5b9e35dc

## How It Works

```
.claude-plugin/
├── plugin.json           ← marketplace identity
└── marketplace.json      ← plugin catalog
plugins/
└── my-visual-explainer/
    ├── .claude-plugin/
    │   └── plugin.json   ← plugin manifest
    ├── SKILL.md           ← workflow + design principles
    ├── commands/          ← slash commands
    ├── references/        ← agent reads before generating
    │   ├── css-patterns.md   (layouts, animations, theming)
    │   ├── libraries.md      (Mermaid, Chart.js, fonts)
    │   ├── responsive-nav.md (sticky TOC for multi-section pages)
    │   └── slide-patterns.md (slide engine, transitions, presets)
    ├── templates/         ← reference templates with different palettes
    │   ├── architecture.html
    │   ├── mermaid-flowchart.html
    │   ├── data-table.html
    │   ├── slide-deck.html
    │   └── theme-switcher-demo.html
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
