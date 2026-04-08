<p>
  <img src="banner.png" alt="visual-explainer" width="1100">
</p>

# visual-explainer

Agent skill that turns complex terminal output into styled HTML pages and slide decks.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

## Why

Coding agents default to ASCII art for diagrams and monospace tables for data. Both break down past trivial complexity — flowcharts become unreadable and tables wrap in the terminal. This skill generates self-contained HTML pages instead, with real typography, dark/light themes, interactive Mermaid diagrams with zoom and pan, and no dependencies beyond a browser.

## Status

| Field | Value |
|-------|-------|
| Version | 0.6.3 |
| Last release | 2026-03-09 |
| Stability | Active development — production-used across iAiFy agents |
| Fork of | [nicobailon/visual-explainer](https://github.com/nicobailon/visual-explainer) (do not PR upstream) |

## Quick Start

**Claude Code (marketplace):**
```shell
/plugin marketplace add AiFeatures/visual-explainer
/plugin install visual-explainer@visual-explainer-marketplace
```

**Pi:**
```bash
curl -fsSL https://raw.githubusercontent.com/AiFeatures/visual-explainer/main/install-pi.sh | bash
```

**OpenAI Codex:**
```bash
git clone --depth 1 https://github.com/AiFeatures/visual-explainer.git /tmp/visual-explainer
cp -r /tmp/visual-explainer/plugins/visual-explainer ~/.agents/skills/visual-explainer
rm -rf /tmp/visual-explainer
```

**AgentHub (enterprise):**
```bash
ln -s "$(pwd)/plugins/visual-explainer" ~/AgentHub/.agents/skills/visual-explainer
```

After install, invoke commands directly or let the agent activate the skill implicitly:

```
> draw a diagram of our authentication flow
> /diff-review
> /plan-review ~/docs/refactor-plan.md
```

## Commands

| Command | Description |
|---------|-------------|
| `/generate-web-diagram` | HTML diagram for any topic |
| `/generate-visual-plan` | Visual implementation plan for a feature |
| `/generate-slides` | Magazine-quality slide deck |
| `/diff-review` | Visual diff review with architecture comparison |
| `/plan-review` | Plan vs. codebase with risk assessment |
| `/project-recap` | Mental model snapshot for context-switching |
| `/fact-check` | Verify a document against actual code |
| `/share` | Deploy an HTML page to Vercel |

Any command that produces a scrollable page also supports `--slides` for slide deck output.

The agent also activates automatically for complex tables (4+ rows or 3+ columns).

## Architecture

```
plugins/visual-explainer/
├── SKILL.md              ← workflow + design principles
├── commands/             ← slash command definitions
├── references/           ← design system docs the agent reads before generating
│   ├── css-patterns.md
│   ├── libraries.md
│   ├── responsive-nav.md
│   └── slide-patterns.md
├── templates/            ← reference HTML with different palettes
│   ├── architecture.html
│   ├── mermaid-flowchart.html
│   ├── data-table.html
│   └── slide-deck.html
└── scripts/
    └── share.sh          ← deploy to Vercel
```

**Output:** `~/.agent/diagrams/<filename>.html` → opens in browser.

The skill routes automatically: Mermaid for flowcharts, CSS Grid for architecture overviews, HTML tables for data, Chart.js for dashboards.

## Development

This is a zero-build skill — no compile step, no test runner, no runtime dependencies. The repo contains Markdown prompts, HTML templates, and reference docs that agents consume directly.

To work on it:

```bash
git clone https://github.com/AiFeatures/visual-explainer.git
cd visual-explainer
```

Validate templates by opening any `plugins/visual-explainer/templates/*.html` file in a browser.

## Deployment

CI/CD uses the enterprise shared workflows from [`Ai-road-4-You/enterprise-ci-cd@v1`](https://github.com/Ai-road-4-You/enterprise-ci-cd). Release tagging follows `release.yml@v1` with `tags-override: latest`.

Upstream sync is managed by [`Ai-road-4-You/fork-sync`](https://github.com/Ai-road-4-You/fork-sync) — do not raise PRs back to the upstream repo.

## Contributing

See [Ai-road-4-You/governance](https://github.com/Ai-road-4-You/governance).

## Credits

Borrows ideas from [Anthropic's frontend-design skill](https://github.com/anthropics/skills) and [interface-design](https://github.com/Dammyjay93/interface-design).

## License

[MIT](LICENSE)
