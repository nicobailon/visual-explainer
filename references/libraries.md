# External Libraries (CDN)

Optional CDN libraries for cases where pure CSS/HTML isn't enough. Only include what the diagram actually needs — most diagrams need zero external JS.

## Mermaid.js — Diagramming Engine

Use for flowcharts, sequence diagrams, ER diagrams, state machines, mind maps, class diagrams, and any diagram where automatic node positioning and edge routing saves effort. Mermaid handles layout — you handle theming.

Do NOT use for dashboards — CSS Grid card layouts with Chart.js look better for those. Data tables use `<table>` elements.

**CDN:**
```html
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

  mermaid.initialize({ startOnLoad: true, /* ... */ });
</script>
```

**With ELK layout** (required for `layout: 'elk'` — it's a separate package, not bundled in core):
```html
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  import elkLayouts from 'https://cdn.jsdelivr.net/npm/@mermaid-js/layout-elk/dist/mermaid-layout-elk.esm.min.mjs';

  mermaid.registerLayoutLoaders(elkLayouts);
  mermaid.initialize({ startOnLoad: true, layout: 'elk', /* ... */ });
</script>
```

Without the ELK import and registration, `layout: 'elk'` silently falls back to dagre. Only import ELK when you actually need it — it adds significant bundle weight. Most simple diagrams render fine with dagre.

### Deep Theming

Always use `theme: 'base'` — it's the only theme where all `themeVariables` are fully customizable. The built-in themes (`default`, `dark`, `forest`, `neutral`) ignore most variable overrides.

```html
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  mermaid.initialize({
    startOnLoad: true,
    theme: 'base',
    look: 'classic',
    themeVariables: {
      // Background and surfaces
      primaryColor: isDark ? '#2d1b69' : '#ede9fe',
      primaryBorderColor: isDark ? '#7c3aed' : '#8b5cf6',
      primaryTextColor: isDark ? '#e6edf3' : '#1a1a2e',
      secondaryColor: isDark ? '#1c2333' : '#f0fdf4',
      secondaryBorderColor: isDark ? '#059669' : '#16a34a',
      secondaryTextColor: isDark ? '#e6edf3' : '#1a1a2e',
      tertiaryColor: isDark ? '#27201a' : '#fef3c7',
      tertiaryBorderColor: isDark ? '#d97706' : '#f59e0b',
      tertiaryTextColor: isDark ? '#e6edf3' : '#1a1a2e',
      // Lines and edges
      lineColor: isDark ? '#6b7280' : '#9ca3af',
      // Text
      // Global default — CSS overrides on .nodeLabel/.edgeLabel win when present
      fontSize: '16px',
      fontFamily: 'var(--font-body)',
      // Notes and labels
      noteBkgColor: isDark ? '#1c2333' : '#fefce8',
      noteTextColor: isDark ? '#e6edf3' : '#1a1a2e',
      noteBorderColor: isDark ? '#fbbf24' : '#d97706',
    }
  });
</script>
```

### Hand-Drawn Mode

Add `look: 'handDrawn'` for a sketchy, whiteboard-style aesthetic. Combines well with the `elk` layout engine for better positioning (requires the ELK import — see CDN section above):

```html
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  import elkLayouts from 'https://cdn.jsdelivr.net/npm/@mermaid-js/layout-elk/dist/mermaid-layout-elk.esm.min.mjs';

  mermaid.registerLayoutLoaders(elkLayouts);
  mermaid.initialize({
    startOnLoad: true,
    theme: 'base',
    look: 'handDrawn',
    layout: 'elk',
    themeVariables: { /* same as above */ }
  });
</script>
```

Or set it per-diagram via frontmatter:
```
---
config:
  look: handDrawn
  layout: elk
---
graph TD
  A[User Request] --> B{Auth Check}
  B -->|Valid| C[Process]
  B -->|Invalid| D[Reject]
```

### CSS Overrides on Mermaid SVG

Mermaid renders SVG. Override its classes for pixel-perfect control that `themeVariables` can't reach:

```css
/* Container — see css-patterns.md "Mermaid Zoom Controls" for the full zoom pattern */
.mermaid-wrap {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  overflow: auto;
}

/* CRITICAL: Force node/edge text to follow the page's color scheme.
   Without this, themeVariables.primaryTextColor works for DEFAULT nodes,
   but any classDef that sets color: will hardcode a single value that
   breaks in the opposite color scheme. Fix: never set color: in classDef,
   and always include these CSS overrides. */
.mermaid .nodeLabel { color: var(--text) !important; }
.mermaid .edgeLabel { color: var(--text-dim) !important; background-color: var(--bg) !important; }
.mermaid .edgeLabel rect { fill: var(--bg) !important; }

/* Node shapes */
.mermaid .node rect,
.mermaid .node circle,
.mermaid .node polygon {
  stroke-width: 1.5px;
}

/* Edge paths */
.mermaid .edge-pattern-solid {
  stroke-width: 1.5px;
}

/* Edge labels — smaller than node labels for visual hierarchy */
.mermaid .edgeLabel {
  font-family: var(--font-mono) !important;
  font-size: 13px !important;
}

/* Node labels — 16px default; drop to 14px for complex diagrams (20+ nodes) */
.mermaid .nodeLabel {
  font-family: var(--font-body) !important;
  font-size: 16px !important;
}

/* Sequence diagram actors */
.mermaid .actor {
  stroke-width: 1.5px;
}

/* Sequence diagram messages */
.mermaid .messageText {
  font-family: var(--font-mono) !important;
  font-size: 12px !important;
}

/* ER diagram entities */
.mermaid .er.entityBox {
  stroke-width: 1.5px;
}

/* Mind map nodes */
.mermaid .mindmap-node rect {
  stroke-width: 1.5px;
}
```

### classDef Gotchas

`classDef` values are static text inside `<pre>` — they can't use CSS variables or JS ternaries. Two rules:

1. **Never set `color:` in classDef.** It hardcodes a text color that breaks in the opposite color scheme. Let the CSS overrides above handle text color via `var(--text)`.

2. **Use semi-transparent fills (8-digit hex) for node backgrounds.** They layer over whatever Mermaid's base theme background is, producing a tint that works in both light and dark modes. Use `20`–`44` alpha for subtle, `55`–`77` for prominent:

```
classDef highlight fill:#b5761433,stroke:#b57614,stroke-width:2px
classDef muted fill:#7c6f6411,stroke:#7c6f6444,stroke-width:1px
```

Avoid opaque light fills like `fill:#fefce8` — they render as bright boxes in dark mode.

### stateDiagram-v2 Label Limitations

State diagram transition labels have a strict parser. Avoid:
- `<br/>` — only works in flowcharts; causes a parse error in state diagrams
- Parentheses in labels — `cancel()` can confuse the parser
- Multiple colons — the first `:` is the label delimiter; extra colons in the label text may break parsing

If you need multi-line labels or special characters, use a `flowchart` instead of `stateDiagram-v2`. Flowcharts support quoted labels (`|"label with: special chars"|`) and `<br/>` for line breaks.

### Writing Valid Mermaid

Most Mermaid failures come from a few recurring issues. Follow these rules to avoid invalid diagrams:

**Quote labels with special characters.** Parentheses, colons, commas, brackets, and ampersands break the parser when unquoted. Wrap any label containing special characters in double quotes:

```
A["handleRequest(ctx)"] --> B["DB: query users"]
A[handleRequest] --> B[query users]
```

**Keep IDs simple.** Node IDs should be alphanumeric with no spaces or punctuation. Put the readable name in the label, not the ID:

```
userSvc["User Service"] --> authSvc["Auth Service"]
```

**Max 15-20 nodes per diagram.** Beyond that, readability collapses even with ELK layout. Use `subgraph` blocks to group related nodes, or split into multiple diagrams:

```
subgraph Auth
  login --> validate --> token
end
subgraph API
  gateway --> router --> handler
end
Auth --> API
```

**Arrow styles for semantic meaning:**

| Arrow | Meaning | Use for |
|-------|---------|---------|
| `-->` | Solid | Primary flow |
| `-.->` | Dotted | Optional, async, or fallback paths |
| `==>` | Thick | Critical or highlighted path |
| `--x` | Cross | Rejected or blocked |
| `-->\|label\|` | Labeled | Decision branches, data descriptions |

**Escape pipes in labels.** If a label contains a literal `|`, use `#124;` (HTML entity) or rephrase to avoid it — pipes delimit edge labels in flowcharts.

**Don't mix diagram syntax.** Each diagram type has its own syntax. `-->` works in flowcharts but not in sequence diagrams (`->>` instead). `:::className` works in flowcharts but not in ER diagrams. When in doubt, check the examples below for correct syntax per type.

### Diagram Type Examples

**Flowchart with decisions:**
```html
<pre class="mermaid">
graph TD
  A[Request] --> B{Authenticated?}
  B -->|Yes| C[Load Dashboard]
  B -->|No| D[Login Page]
  D --> E[Submit Credentials]
  E --> B
  C --> F{Role?}
  F -->|Admin| G[Admin Panel]
  F -->|User| H[User Dashboard]
</pre>
```

**Sequence diagram:**
```html
<pre class="mermaid">
sequenceDiagram
  participant C as Client
  participant G as Gateway
  participant S as Service
  participant D as Database
  C->>G: POST /api/data
  G->>G: Validate JWT
  G->>S: Forward request
  S->>D: Query
  D-->>S: Results
  S-->>G: Response
  G-->>C: 200 OK
</pre>
```

**ER diagram:**
```html
<pre class="mermaid">
erDiagram
  USERS ||--o{ ORDERS : places
  ORDERS ||--|{ LINE_ITEMS : contains
  LINE_ITEMS }o--|| PRODUCTS : references
  USERS { string email PK }
  ORDERS { int id PK }
  LINE_ITEMS { int quantity }
  PRODUCTS { string name }
</pre>
```

**State diagram:**
```html
<pre class="mermaid">
stateDiagram-v2
  [*] --> Draft
  Draft --> Review : submit
  Review --> Approved : approve
  Review --> Draft : request_changes
  Approved --> Published : publish
  Published --> Archived : archive
  Archived --> [*]
</pre>
```

**Mind map:**
```html
<pre class="mermaid">
mindmap
  root((Project))
    Frontend
      React
      Next.js
      Tailwind
    Backend
      Node.js
      PostgreSQL
      Redis
    Infrastructure
      AWS
      Docker
      Terraform
</pre>
```

### Dark Mode Handling

Mermaid initializes once — it can't reactively switch themes. Read the preference at load time inside your `<script type="module">`:

```javascript
const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
// Use isDark to pick light or dark values in themeVariables
```

The CSS overrides on the container (`.mermaid-wrap`) and page will still respond to `prefers-color-scheme` normally — only the Mermaid SVG internals are static.

## Chart.js — Data Visualizations

Use for bar charts, line charts, pie/doughnut charts, radar charts, and other data-driven visualizations in dashboard-type diagrams. Overkill for static numbers — use pure SVG/CSS for simple progress bars and sparklines.

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>

<canvas id="myChart" width="600" height="300"></canvas>

<script>
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const textColor = isDark ? '#8b949e' : '#6b7280';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const fontFamily = getComputedStyle(document.documentElement)
    .getPropertyValue('--font-body').trim() || 'system-ui, sans-serif';

  new Chart(document.getElementById('myChart'), {
    type: 'bar',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
      datasets: [{
        label: 'Feedback Items',
        data: [45, 62, 78, 91, 120],
        backgroundColor: isDark ? 'rgba(129, 140, 248, 0.6)' : 'rgba(79, 70, 229, 0.6)',
        borderColor: isDark ? '#818cf8' : '#4f46e5',
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: textColor, font: { family: fontFamily } } },
      },
      scales: {
        x: { ticks: { color: textColor, font: { family: fontFamily } }, grid: { color: gridColor } },
        y: { ticks: { color: textColor, font: { family: fontFamily } }, grid: { color: gridColor } },
      }
    }
  });
</script>
```

Wrap the canvas in a styled container:
```css
.chart-container {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 20px;
  position: relative;
}

.chart-container canvas {
  max-height: 300px;
}
```

## anime.js — Orchestrated Animations

Use when a diagram has 10+ elements and you want a choreographed entrance sequence (staggered reveals, path drawing, count-up numbers). For simpler diagrams, CSS `animation-delay` staggering is sufficient.

```html
<script src="https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js"></script>

<script>
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!prefersReduced) {
    anime({
      targets: '.ve-card',
      opacity: [0, 1],
      translateY: [20, 0],
      delay: anime.stagger(80, { start: 200 }),
      easing: 'easeOutCubic',
      duration: 500,
    });

    anime({
      targets: '.connector path',
      strokeDashoffset: [anime.setDashoffset, 0],
      easing: 'easeInOutCubic',
      duration: 800,
      delay: anime.stagger(150, { start: 600 }),
    });

    document.querySelectorAll('[data-count]').forEach(el => {
      anime({
        targets: { val: 0 },
        val: parseInt(el.dataset.count),
        round: 1,
        duration: 1200,
        delay: 400,
        easing: 'easeOutExpo',
        update: (anim) => { el.textContent = anim.animations[0].currentValue; }
      });
    });
  }
</script>
```

When using anime.js, set initial opacity to 0 in CSS so elements don't flash before the animation:
```css
.ve-card { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .ve-card { opacity: 1 !important; }
}
```

## Google Fonts — Typography

Always load with `display=swap` for fast rendering. Pick a distinctive pairing — body + mono at minimum, optionally a display font for the title.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
```

Define as CSS variables for easy reference:
```css
:root {
  --font-body: 'Outfit', system-ui, sans-serif;
  --font-mono: 'Space Mono', 'SF Mono', Consolas, monospace;
}
```

**Font suggestions** (rotate — never use the same pairing twice in a row):

| Body / Headings | Mono / Labels | Feel |
|---|---|---|
| Outfit | Space Mono | Clean geometric, modern |
| Instrument Serif | JetBrains Mono | Editorial, refined |
| Sora | IBM Plex Mono | Technical, precise |
| DM Sans | Fira Code | Friendly, developer |
| Fraunces | Source Code Pro | Warm, distinctive |
| Libre Franklin | Inconsolata | Classic, reliable |
| Manrope | Martian Mono | Soft, contemporary |
| Playfair Display | Roboto Mono | Elegant contrast |
| Bricolage Grotesque | Fragment Mono | Bold, characterful |
| Geist | Geist Mono | Vercel-inspired, sharp |
| Crimson Pro | Noto Sans Mono | Scholarly, serious |
| Red Hat Display | Red Hat Mono | Cohesive family |
| Plus Jakarta Sans | Azeret Mono | Rounded, approachable |

Never default to Inter, Roboto, Arial, or system-ui as the primary choice.
