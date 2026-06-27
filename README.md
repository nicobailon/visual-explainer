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

| Harness | Support | Install path / behavior |
|---|---|---|
| Claude Code | Marketplace plugin | Preserved marketplace shape with source at `plugins/visual-explainer/`; bundled command workflows are also shipped as user-invoked, non-model-invokable skills |
| Pi | Package metadata plus installer | `package.json` advertises the main skill, command wrapper skills, prompts, and native `visual_explainer` tool with `prepare` and `render` actions; `install-pi.sh` installs copied skill/prompt resources for legacy manual installs |
| Codex CLI | Native skill path plus optional prompts | Copy to `~/.codex/skills/visual-explainer` and copy command wrapper skills from `plugins/visual-explainer/skills/*`; optional prompts go in `~/.codex/prompts/` if your Codex build supports them |
| OpenCode/opencode | Observed skill/command paths | Copy to `~/.config/opencode/skill/visual-explainer` and copy command wrapper skills from `plugins/visual-explainer/skills/*`; optional commands go in `~/.config/opencode/command/` |
| Cursor | Rules-based guidance | Add the supplied `.mdc` rule; Cursor is not treated as native Agent Skills support |
| OpenClaw | Lightweight AGENTS/rules guidance | Use the supplied AGENTS guidance with the canonical skill directory |

**Claude Code (marketplace):**
```shell
/plugin marketplace add nicobailon/visual-explainer
/plugin install visual-explainer@visual-explainer-marketplace
```

Note: Claude Code plugins namespace commands as `/visual-explainer:command-name`.

**Pi:**
```bash
pi install git:github.com/nicobailon/visual-explainer
```

Or from a local checkout:
```bash
git clone --depth 1 https://github.com/nicobailon/visual-explainer.git
pi install ./visual-explainer
```

The package manifest advertises the canonical skill, command templates, and Pi tool:

```json
"pi": {
  "extensions": ["./plugins/visual-explainer/extension.ts"],
  "skills": [
    "./plugins/visual-explainer",
    "./plugins/visual-explainer/skills"
  ],
  "prompts": ["./plugins/visual-explainer/commands"]
}
```

The Pi extension registers one native `visual_explainer` tool. Use `action: "prepare"` to plan a visual explanation after generating or reviewing a substantial plan, architecture, diff, or implementation, and `action: "render"` to write complete HTML pages to `~/.agent/diagrams/`. The bundled command workflows are also exposed as user-invoked skills with `disable-model-invocation: true`, so harnesses without prompt/command primitives can still offer them without adding them to the model's automatic skill list. `/generate-web-diagram` remains a bundled prompt template command for harnesses that support prompts.

If you previously used the old curl/manual installer, remove those copied files before using `pi install`; otherwise Pi will report skill and prompt conflicts because the user-level copies shadow the package resources:

```bash
rm -rf ~/.pi/agent/skills/{visual-explainer,diff-review,fact-check,generate-slides,generate-visual-plan,generate-web-diagram,plan-review,project-recap}
rm -f ~/.pi/agent/prompts/{diff-review,fact-check,generate-slides,generate-visual-plan,generate-web-diagram,plan-review,project-recap}.md
rm -f ~/.pi/agent/prompts/s[h]are*.md
```

The legacy installer still works if you prefer copied skill and prompt files over package management, but it does not install the native Pi tool:

```bash
curl -fsSL https://raw.githubusercontent.com/nicobailon/visual-explainer/main/install-pi.sh | bash
```

**Codex CLI:**
```bash
git clone --depth 1 https://github.com/nicobailon/visual-explainer.git /tmp/visual-explainer

mkdir -p ~/.codex/skills ~/.codex/prompts
cp -R /tmp/visual-explainer/plugins/visual-explainer ~/.codex/skills/visual-explainer
cp -R /tmp/visual-explainer/plugins/visual-explainer/skills/* ~/.codex/skills/

# Optional, only if your Codex build supports prompt templates:
cp /tmp/visual-explainer/plugins/visual-explainer/commands/*.md ~/.codex/prompts/

rm -rf /tmp/visual-explainer
```

Invoke with `$visual-explainer` or ask Codex to use the `visual-explainer` skill. Command workflows are available as user-invoked skills such as `$diff-review`, `$plan-review`, and `$generate-web-diagram`; they load the main visual-explainer skill and are marked `disable-model-invocation: true`. If prompts are installed and supported, use `/prompts:diff-review`, `/prompts:plan-review`, etc.

**OpenCode/opencode:**
```bash
git clone --depth 1 https://github.com/nicobailon/visual-explainer.git /tmp/visual-explainer

mkdir -p ~/.config/opencode/skill ~/.config/opencode/command
cp -R /tmp/visual-explainer/plugins/visual-explainer ~/.config/opencode/skill/visual-explainer
cp -R /tmp/visual-explainer/plugins/visual-explainer/skills/* ~/.config/opencode/skill/

# Optional command templates:
cp /tmp/visual-explainer/plugins/visual-explainer/commands/*.md ~/.config/opencode/command/

rm -rf /tmp/visual-explainer
```

Activate it by asking OpenCode to use the `visual-explainer` skill. Command workflows are available as user-invoked skills such as `diff-review`, `plan-review`, and `generate-web-diagram`; they load the main visual-explainer skill and are marked `disable-model-invocation: true`. Command-template behavior depends on the installed OpenCode/opencode build.

**Cursor:**

Add `configs/cursor/visual-explainer.mdc` to your Cursor rules, or copy its contents into the project rules UI. This is rules-based guidance that points Cursor at the canonical skill; it does not claim native Agent Skills support.

**OpenClaw:**

Use `configs/openclaw/AGENTS.md` as lightweight project guidance and copy or reference `plugins/visual-explainer/` as the canonical skill source. No native OpenClaw plugin adapter is included.

## Commands and command skills

Each bundled workflow ships both as a prompt/command template for command-aware harnesses and as a user-invoked skill for harnesses that only support skills. The command skill names match the command names and are marked `disable-model-invocation: true`, so they do not appear in the model's automatic skill list.

| Command / skill | What it does |
|---------|-------------|
| `/generate-web-diagram` / `generate-web-diagram` | Generate an HTML diagram for any topic |
| `/generate-visual-plan` / `generate-visual-plan` | Generate a visual implementation plan for a feature or extension |
| `/generate-slides` / `generate-slides` | Generate a magazine-quality slide deck |
| `/diff-review` / `diff-review` | Visual diff review with architecture comparison and code review |
| `/plan-review` / `plan-review` | Compare a plan against the codebase with risk assessment |
| `/project-recap` / `project-recap` | Mental model snapshot for context-switching back to a project |
| `/fact-check` / `fact-check` | Verify accuracy of a document against actual code |

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
    ├── extension.ts       ← Pi native tool
    ├── commands/          ← prompt/slash command templates
    ├── skills/            ← user-invoked, non-model-invokable command wrapper skills
    ├── references/        ← agent reads before generating
    │   ├── css-patterns.md   (layouts, animations, theming)
    │   ├── libraries.md      (Mermaid, Chart.js, fonts)
    │   ├── responsive-nav.md (sticky TOC for multi-section pages)
    │   └── slide-patterns.md (slide engine, transitions, presets)
    └── templates/         ← reference templates with different palettes
        ├── architecture.html
        ├── mermaid-flowchart.html
        ├── data-table.html
        └── slide-deck.html
```

**Output:** `~/.agent/diagrams/filename.html` → opens in browser. In Pi package installs, agents can offer `visual_explainer` with `action: "prepare"` after generating or reviewing a substantial plan, architecture, diff, or implementation when a visual explanation would help, then call it with `action: "render"` as the final write/open step.

The skill routes to the right approach automatically: Mermaid for flowcharts and diagrams, CSS Grid for architecture overviews, HTML tables for data, Chart.js for dashboards.

## Limitations

- Generated HTML is portable and self-contained, but auto-opening depends on the harness, browser access, and sandbox rules.
- All harnesses write visual output to `~/.agent/diagrams/` unless the user asks for a different path.
- Switching OS theme requires a page refresh for Mermaid SVGs.
- Results vary by model capability.

## Credits

Borrows ideas from [Anthropic's frontend-design skill](https://github.com/anthropics/skills) and [interface-design](https://github.com/Dammyjay93/interface-design).

## License

MIT
