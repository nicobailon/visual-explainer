# GitHub Light

Light-first theme based on [GitHub's Primer design system](https://primer.style/). Clean, minimal, and professional with GitHub's signature blue accent.

## CSS Custom Properties

Primary mode is light. Dark mode via `@media (prefers-color-scheme: dark)`.

```css
:root {
  --bg: #ffffff;
  --surface: #f6f8fa;
  --surface-elevated: #ffffff;
  --border: rgba(0, 0, 0, 0.08);
  --border-bright: #d0d7de;
  --text: #1f2328;
  --text-dim: #656d76;
  --accent: #0969da;
  --accent-dim: rgba(9, 105, 218, 0.10);

  --node-a: #0969da;
  --node-a-dim: rgba(9, 105, 218, 0.10);
  --node-b: #1a7f37;
  --node-b-dim: rgba(26, 127, 55, 0.10);
  --node-c: #8250df;
  --node-c-dim: rgba(130, 80, 223, 0.10);

  --green: #1a7f37;
  --green-dim: rgba(26, 127, 55, 0.10);
  --red: #cf222e;
  --red-dim: rgba(207, 34, 46, 0.10);
  --orange: #bc4c00;
  --orange-dim: rgba(188, 76, 0, 0.10);
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0d1117;
    --surface: #161b22;
    --surface-elevated: #1c2333;
    --border: rgba(255, 255, 255, 0.06);
    --border-bright: #30363d;
    --text: #e6edf3;
    --text-dim: #8b949e;
    --accent: #58a6ff;
    --accent-dim: rgba(88, 166, 255, 0.12);

    --node-a: #58a6ff;
    --node-a-dim: rgba(88, 166, 255, 0.12);
    --node-b: #3fb950;
    --node-b-dim: rgba(63, 185, 80, 0.12);
    --node-c: #bc8cff;
    --node-c-dim: rgba(188, 140, 255, 0.12);

    --green: #3fb950;
    --green-dim: rgba(63, 185, 80, 0.12);
    --red: #f85149;
    --red-dim: rgba(248, 81, 73, 0.12);
    --orange: #d29922;
    --orange-dim: rgba(210, 153, 34, 0.12);
  }
}
```

## Mermaid themeVariables

Use with `theme: 'base'` in Mermaid configuration.

```json
{
  "primaryColor": "#f6f8fa",
  "primaryTextColor": "#1f2328",
  "primaryBorderColor": "#d0d7de",
  "secondaryColor": "#0969da",
  "secondaryTextColor": "#ffffff",
  "secondaryBorderColor": "#0969da",
  "tertiaryColor": "#ffffff",
  "tertiaryTextColor": "#1f2328",
  "tertiaryBorderColor": "#d0d7de",
  "lineColor": "#656d76",
  "textColor": "#1f2328",
  "mainBkg": "#f6f8fa",
  "nodeBorder": "#d0d7de",
  "clusterBkg": "#ffffff",
  "clusterBorder": "#d0d7de",
  "titleColor": "#1f2328",
  "edgeLabelBackground": "#ffffff",
  "nodeTextColor": "#1f2328"
}
```
