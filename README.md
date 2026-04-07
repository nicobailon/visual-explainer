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

## Agent-Hub Integration

This fork is registered as a skill plugin in the iAiFy [AgentHub](https://github.com/AiFeatures) — the shared skill layer used by all 14 agents across the enterprise.

### Manifest

`agenthub-skill.json` at the repo root declares the skill to agent-hub:

```json
{
  "name": "visual-explainer",
  "version": "0.6.3",
  "type": "output-skill",
  "capabilities": ["diagram", "diff-review", "plan-review", "data-table", "slide-deck"],
  "triggers": ["/diagram", "/diff-review", "/plan-review", "/explain"],
  "output_format": "html",
  "integration": {
    "agent-hub": { "register_as": "skill", "category": "visualization" }
  }
}
```

### Integration points

| Point | Detail |
| --- | --- |
| Skill entry point | `plugins/visual-explainer/SKILL.md` — loaded automatically when a trigger fires |
| Commands | `plugins/visual-explainer/commands/*.md` — one file per slash command |
| Templates | `plugins/visual-explainer/templates/` — reference HTML the agent reads before generating |
| Output directory | `~/.agent/diagrams/` — shared across all hub agents |
| Trigger namespace | `/visual-explainer:<command>` in Claude Code; bare `/command` in Pi |

### Install into AgentHub

```bash
# Symlink the skill into the shared skills directory
ln -s "$(pwd)/plugins/visual-explainer" ~/AgentHub/.agents/skills/visual-explainer

# Verify the skill is discoverable
ls ~/AgentHub/.agents/skills/visual-explainer/SKILL.md
```

After linking, any agent that loads skills from `~/AgentHub/.agents/skills/` will pick up visual-explainer automatically on the next session start.

### Upstream sync

The `upstream-watch` branch tracks `upstream/main` (nicobailon/visual-explainer). Sync is managed by `Ai-road-4-You/fork-sync` — do not raise PRs back to upstream.

```bash
git fetch upstream
git log upstream/main..upstream-watch   # see what upstream has changed
```

## Limitations

- Requires a browser to view
- Switching OS theme requires a page refresh for Mermaid SVGs
- Results vary by model capability

## Credits

Borrows ideas from [Anthropic's frontend-design skill](https://github.com/anthropics/skills) and [interface-design](https://github.com/Dammyjay93/interface-design).

## License

MIT
