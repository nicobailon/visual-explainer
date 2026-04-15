# Tokyo Night

Dark-first theme based on [Tokyo Night](https://github.com/tokyo-night/tokyo-night-vscode-theme). Inspired by the lights of downtown Tokyo at night. Cool blues and purples with warm accent colors.

## CSS Custom Properties

Primary mode is dark. Light mode via `@media (prefers-color-scheme: light)`.

```css
:root {
  --bg: #1a1b26;
  --surface: #24283b;
  --surface-elevated: #292e42;
  --border: rgba(255, 255, 255, 0.06);
  --border-bright: rgba(255, 255, 255, 0.12);
  --text: #a9b1d6;
  --text-dim: #565f89;
  --accent: #7aa2f7;
  --accent-dim: rgba(122, 162, 247, 0.12);

  --node-a: #7aa2f7;
  --node-a-dim: rgba(122, 162, 247, 0.12);
  --node-b: #9ece6a;
  --node-b-dim: rgba(158, 206, 106, 0.12);
  --node-c: #bb9af7;
  --node-c-dim: rgba(187, 154, 247, 0.12);

  --green: #9ece6a;
  --green-dim: rgba(158, 206, 106, 0.12);
  --red: #f7768e;
  --red-dim: rgba(247, 118, 142, 0.12);
  --orange: #ff9e64;
  --orange-dim: rgba(255, 158, 100, 0.12);
}

@media (prefers-color-scheme: light) {
  :root {
    --bg: #e6e7ed;
    --surface: #d5d6db;
    --surface-elevated: #ffffff;
    --border: rgba(0, 0, 0, 0.08);
    --border-bright: rgba(0, 0, 0, 0.15);
    --text: #343b58;
    --text-dim: #6c6e75;
    --accent: #2959aa;
    --accent-dim: rgba(41, 89, 170, 0.10);

    --node-a: #2959aa;
    --node-a-dim: rgba(41, 89, 170, 0.10);
    --node-b: #385f0d;
    --node-b-dim: rgba(56, 95, 13, 0.10);
    --node-c: #5a3e8e;
    --node-c-dim: rgba(90, 62, 142, 0.10);

    --green: #385f0d;
    --green-dim: rgba(56, 95, 13, 0.10);
    --red: #8c4351;
    --red-dim: rgba(140, 67, 81, 0.10);
    --orange: #965027;
    --orange-dim: rgba(150, 80, 39, 0.10);
  }
}
```

## Mermaid themeVariables

Use with `theme: 'base'` in Mermaid configuration.

```json
{
  "primaryColor": "#24283b",
  "primaryTextColor": "#a9b1d6",
  "primaryBorderColor": "#565f89",
  "secondaryColor": "#7aa2f7",
  "secondaryTextColor": "#1a1b26",
  "secondaryBorderColor": "#7aa2f7",
  "tertiaryColor": "#1a1b26",
  "tertiaryTextColor": "#a9b1d6",
  "tertiaryBorderColor": "#565f89",
  "lineColor": "#565f89",
  "textColor": "#a9b1d6",
  "mainBkg": "#24283b",
  "nodeBorder": "#565f89",
  "clusterBkg": "#1a1b26",
  "clusterBorder": "#565f89",
  "titleColor": "#a9b1d6",
  "edgeLabelBackground": "#1a1b26",
  "nodeTextColor": "#a9b1d6"
}
```
