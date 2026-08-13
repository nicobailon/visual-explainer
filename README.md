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

This skill fixes that. Real typography, dark/light themes, interactive Mermaid diagrams with zoom and pan. Normal skill use has no build step and no dependency beyond a browser; the optional MCP server uses the official MCP SDK.

## Install

| Harness | Support | Install path / behavior |
|---|---|---|
| Claude Code | Marketplace plugin | Preserved marketplace shape with source at `plugins/visual-explainer/` |
| Pi | Package metadata plus installer | `package.json` advertises the skill, prompts, and native `visual_explainer` tool with `prepare` and `render` actions; `install-pi.sh` installs copied skill/prompt resources for legacy manual installs |
| MCP hosts | Local stdio MCP server | `visual-explainer-mcp` exposes render tools, prompt templates, and read-only skill resources without starting an HTTP server |
| Antigravity CLI | Native Agent Skills path | Copy `plugins/visual-explainer/` to `~/.gemini/antigravity-cli/skills/visual-explainer` for global use or `.agents/skills/visual-explainer` for one workspace |
| Codex CLI | Native skill path plus optional prompts | Copy to `~/.codex/skills/visual-explainer`; optional prompts go in `~/.codex/prompts/` if your Codex build supports them |
| OpenCode/opencode | Observed skill/command paths | Copy to `~/.config/opencode/skill/visual-explainer`; optional commands go in `~/.config/opencode/command/` |
| Cursor | Rules-based guidance | Add the supplied `.mdc` rule; Cursor is not treated as native Agent Skills support |
| OpenClaw | Lightweight AGENTS/rules guidance | Use the supplied AGENTS guidance with the canonical skill directory |
| VS Code Copilot / Copilot CLI | Custom instructions or rules guidance | Add the supplied AGENTS guidance to your supported workspace instruction or rules setup |

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
  "skills": ["./plugins/visual-explainer"],
  "prompts": ["./plugins/visual-explainer/commands"],
  "image": "./banner.png"
}
```

The Pi extension registers one native `visual_explainer` tool. Use `action: "prepare"` to plan a visual explanation after generating or reviewing a substantial plan, architecture, diff, or implementation, and `action: "render"` to write complete HTML pages to `~/.agent/diagrams/`. The opt-in `action: "render_quick"` validates a compact JSON spec and renders it with the bundled local renderer. Render actions can open with `viewer: "browser"` by default, `viewer: "glimpse"` when `glimpseui` is installed, or `viewer: "auto"` to try Glimpse and fall back to the browser. `/generate-web-diagram` remains the bundled prompt template command.

If you previously used the old curl/manual installer, remove those copied files before using `pi install`; otherwise Pi will report skill and prompt conflicts because the user-level copies shadow the package resources:

```bash
rm -rf ~/.pi/agent/skills/visual-explainer
rm -f ~/.pi/agent/prompts/{diff-review,fact-check,generate-slides,generate-visual-plan,generate-web-diagram,plan-review,project-recap}.md
rm -f ~/.pi/agent/prompts/s[h]are*.md
```

The legacy installer still works if you prefer copied skill and prompt files over package management, but it does not install the native Pi tool:

```bash
curl -fsSL https://raw.githubusercontent.com/nicobailon/visual-explainer/main/install-pi.sh | bash
```

**MCP:**

Use `visual-explainer-mcp` from a package install, or run `npm install --no-package-lock` before pointing your host at `plugins/visual-explainer/mcp/server.mjs` from a checkout. Some hosts need an absolute path to the binary. The MCP server is local stdio only. It does not call an LLM, start an HTTP listener, handle credentials, or write outside `~/.agent/diagrams/`.

Example package configuration:

```json
{
  "mcpServers": {
    "visual-explainer": {
      "command": "visual-explainer-mcp"
    }
  }
}
```

Example checkout configuration:

```json
{
  "mcpServers": {
    "visual-explainer": {
      "command": "node",
      "args": ["/absolute/path/to/visual-explainer/plugins/visual-explainer/mcp/server.mjs"]
    }
  }
}
```

The server exposes three tools: `visual_explainer_prepare`, `visual_explainer_render_html`, and `visual_explainer_render_quick`. Render tools default to `open: false`; set `open: true` only when you want the server to request a browser or Glimpse window. It also exposes the bundled command templates as MCP prompts and the canonical `SKILL.md`, command markdown, quick README, and quick schema as read-only resources.

**Antigravity CLI:**

Antigravity CLI is the supported Google successor path for consumer Gemini CLI workflows. It loads Agent Skills from `.agents/skills/` at the workspace level or `~/.gemini/antigravity-cli/skills/` globally.

Global install:
```bash
git clone --depth 1 https://github.com/nicobailon/visual-explainer.git /tmp/visual-explainer

mkdir -p ~/.gemini/antigravity-cli/skills
cp -R /tmp/visual-explainer/plugins/visual-explainer ~/.gemini/antigravity-cli/skills/visual-explainer

rm -rf /tmp/visual-explainer
```

Workspace install:
```bash
git clone --depth 1 https://github.com/nicobailon/visual-explainer.git /tmp/visual-explainer

mkdir -p .agents/skills
cp -R /tmp/visual-explainer/plugins/visual-explainer .agents/skills/visual-explainer

rm -rf /tmp/visual-explainer
```

Launch `agy` in the project and use `/skills` to confirm `visual-explainer` is discovered. Ask Antigravity to use the `visual-explainer` skill for diagrams, visual reviews, slide decks, and complex tables. Antigravity SDK projects can reuse the same `SKILL.md` content as an Agent Skill resource, but this repo does not ship a separate SDK wrapper. The bundled prompt templates remain reference markdown under `plugins/visual-explainer/commands/`; no separate Antigravity plugin adapter is included.

**Codex CLI:**
```bash
git clone --depth 1 https://github.com/nicobailon/visual-explainer.git /tmp/visual-explainer

mkdir -p ~/.codex/skills ~/.codex/prompts
cp -R /tmp/visual-explainer/plugins/visual-explainer ~/.codex/skills/visual-explainer

# Optional, only if your Codex build supports prompt templates:
cp /tmp/visual-explainer/plugins/visual-explainer/commands/*.md ~/.codex/prompts/

rm -rf /tmp/visual-explainer
```

Invoke with `$visual-explainer` or ask Codex to use the `visual-explainer` skill. If prompts are installed and supported, use `/prompts:diff-review`, `/prompts:plan-review`, etc.

**OpenCode/opencode:**
```bash
git clone --depth 1 https://github.com/nicobailon/visual-explainer.git /tmp/visual-explainer

mkdir -p ~/.config/opencode/skill ~/.config/opencode/command
cp -R /tmp/visual-explainer/plugins/visual-explainer ~/.config/opencode/skill/visual-explainer

# Optional command templates:
cp /tmp/visual-explainer/plugins/visual-explainer/commands/*.md ~/.config/opencode/command/

rm -rf /tmp/visual-explainer
```

Activate it by asking OpenCode to use the `visual-explainer` skill. Command-template behavior depends on the installed OpenCode/opencode build.

**Cursor:**

Add `configs/cursor/visual-explainer.mdc` to your Cursor rules, or copy its contents into the project rules UI. This is rules-based guidance that points Cursor at the canonical skill; it does not claim native Agent Skills support.

**OpenClaw:**

Use `configs/openclaw/AGENTS.md` as lightweight project guidance and copy or reference `plugins/visual-explainer/` as the canonical skill source. No native OpenClaw plugin adapter is included.

**VS Code Copilot / Copilot CLI:**

Use `configs/copilot/AGENTS.md` as custom instructions or rules guidance. For VS Code, copy it into a supported workspace custom-instructions file, such as `.github/copilot-instructions.md`. For Copilot CLI, add it through the workspace instruction or rules setup supported by your installed version. Both read the canonical skill from `plugins/visual-explainer/`; this repository does not provide native Agent Skills support, a Copilot package, or a tested Copilot plugin adapter.

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

The agent also kicks in automatically when it's about to dump a complex table in the terminal (4+ rows or 3+ columns) — it renders HTML instead.

## Quick Mode

Add `--quick` to `/generate-web-diagram`, `/diff-review`, `/plan-review`, or `/project-recap` to ask the agent for a compact JSON spec. The bundled renderer validates the spec, escapes its content, and creates a complete self-contained HTML page. Pi uses the existing `visual_explainer` tool with `action: "render_quick"`. Other harnesses can run `plugins/visual-explainer/quick/render.mjs` locally.

Quick mode is opt-in. Commands without `--quick` keep the full custom HTML workflow. The agent also falls back to full mode when the content does not fit the quick schema or when validation or rendering fails.

```text
/generate-web-diagram --quick authentication request flow
/diff-review --quick main..HEAD
```

## Slide Deck Mode

Any command that produces a scrollable page supports `--slides` to generate a slide deck instead:

```
/diff-review --slides
/project-recap --slides 2w
```

https://github.com/user-attachments/assets/342d3558-5fcf-4fb2-bc03-f0dd5b9e35dc

## Themes

Ask for switchable themes, or name a palette, and the page gets a picker — colored dots for the palette and `Aa` chips for the font pair, both swapping live and re-rendering every Mermaid diagram:

```
"explain this pipeline, use Gruvbox"
"diagram the auth flow, let me switch themes"
```

Eleven palettes ship with it: Dracula, Nord, One Dark, Catppuccin Mocha, Tokyo Night, Gruvbox Dark, Synthwave '84 (dark) and Solarized Light, GitHub Light, Catppuccin Latte, Gruvbox Light. The font chips offer the pairs the skill already recommends. Mermaid colors and label fonts are derived from the active selection, so diagrams always match the page around them. Set `theme:` or `font:` in `visual-explainer.config.md` to choose what loads first. Claude Code users can keep personal overrides in `.claude/visual-explainer.local.md`; shared project defaults should use the harness-neutral file.

The picker is opt-in. Pages that don't ask for one still get a single palette and font pair chosen to fit the content.

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
    ├── commands/          ← slash commands
    ├── quick/             ← JSON schema + deterministic local renderer
    ├── mcp/               ← local stdio MCP server
    ├── references/        ← agent reads before generating
    │   ├── css-patterns.md   (layouts, animations, theming)
    │   ├── libraries.md      (Mermaid, Chart.js, fonts)
    │   ├── responsive-nav.md (sticky TOC for multi-section pages)
    │   ├── slide-patterns.md (slide engine, transitions, presets)
    │   └── themes.md          (11 palettes + runtime theme/font picker)
    └── templates/         ← reference templates with different palettes
        ├── architecture.html
        ├── mermaid-flowchart.html
        ├── data-table.html
        └── slide-deck.html
```

**Output:** `~/.agent/diagrams/filename.html` → opens in browser. When you explicitly request AI-readable output or a source brief, the agent can also write `~/.agent/diagrams/filename.md` as a concise companion. It asks before replacing an existing companion. HTML remains the final visual output; the Markdown companion is not its source. In Pi package installs, agents can offer `visual_explainer` with `action: "prepare"` after generating or reviewing a substantial plan, architecture, diff, or implementation when a visual explanation would help, then call it with `action: "render"` as the final write/open step. MCP hosts use the separate `visual-explainer-mcp` stdio server and default render tools to `open: false`.

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
