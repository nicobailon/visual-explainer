# static-assembler prototype

A lightweight rendering pipeline for visual-explainer architecture pages.

## Goal

Move repetitive CSS/HTML scaffolding out of the LLM output. The LLM emits a compact JSON spec; this renderer produces the final self-contained HTML.

## Usage

```bash
node render-architecture.mjs spec.json out.html
```

## Spec shape

All new fields are **optional** — existing specs work unchanged.

```json
{
  "title": "Rho System Architecture",
  "subtitle": "worker orchestration and memory pipelines",
  "theme": "terracotta",

  "kpis": [
    { "value": "41s", "label": "Avg render time", "tone": "green", "delta": "↓75% vs v1" },
    { "value": "880", "label": "LLM tokens out",  "tone": "teal",  "delta": "↓89% vs v1" },
    { "value": "5",   "label": "Benchmark runs",  "tone": "accent" }
  ],

  "legend": [
    { "label": "no-llm", "tone": "teal" },
    { "label": "llm",    "tone": "green" },
    { "label": "db",     "tone": "accent" }
  ],

  "inputLabel": "Input Sources",
  "inputSources": [
    { "icon": "🖥️", "label": "Terminal" },
    { "icon": "📨", "label": "Email" }
  ],

  "gateway": {
    "label": "Gateway Layer",
    "cards": [
      {
        "title": "CLI Router",
        "desc": "Dispatches user tasks to skills and tools.",
        "tags": ["fish shell", "tmux"]
      }
    ]
  },

  "pipeline": {
    "label": "Processing Pipeline",
    "steps": [
      { "name": "Parse",   "detail": "Intent extraction",       "kind": "no-llm" },
      { "name": "Reason",  "detail": "LLM planning",            "kind": "llm" },
      { "name": "Persist", "detail": "Write `brain.jsonl`",     "kind": "db" }
    ]
  },

  "database": {
    "label": "Storage Layer",
    "cards": [
      {
        "title": "brain.jsonl",
        "desc": "Durable memories and tasks",
        "tags": ["JSONL", "append-only"]
      }
    ]
  },

  "outputs": [
    {
      "label": "User Surfaces",
      "blurb": "Everything the user sees or hears directly.",
      "items": ["CLI", "HTML diagrams", "notifications"]
    },
    { "label": "Automation",   "items": ["heartbeats", "reminders", "subagents"] },
    { "label": "Observability","items": ["logs", "metrics", "artifacts"] }
  ],

  "calloutTitle": "Invariant",
  "callout": "All automation should remain deterministic and verifiable.",
  "generatedAt": "2026-02-26T00:00:00Z"
}
```

### Optional rich fields

| Field | Type | Where | Description |
|---|---|---|---|
| `kpis` | `[{value, label, tone?, delta?}]` | top-level | KPI strip rendered under subtitle |
| `legend` | `[{label, tone}]` | top-level | Compact badge row (e.g. pipeline kind key) |
| `gateway.cards[].tags` | `string[]` | gateway/database cards | Pill badges shown below desc |
| `database.cards[].tags` | `string[]` | gateway/database cards | Pill badges shown below desc |
| `outputs[].blurb` | `string` | output sections | Short paragraph under section label |

### Inline code formatting

Wrap text in backticks in any textual field (`desc`, `detail`, `blurb`, `callout`, `items[]`) to produce styled `<code>` spans. HTML is safely escaped before conversion — no XSS risk.

Example: `"detail": "Writes to \`brain.jsonl\`"` → renders as `<code>brain.jsonl</code>`.

## Themes

`theme` supports:
- `terracotta`
- `teal`
- `rose`
- `blueprint`
