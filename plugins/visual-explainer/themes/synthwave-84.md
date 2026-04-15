# Synthwave '84

Dark-first theme based on [SynthWave '84](https://github.com/robb0wen/synthwave-vscode). Neon pinks, cyans, and yellows on deep purple backgrounds. Evokes the retro-futuristic aesthetic of 1980s synthwave.

## CSS Custom Properties

Primary mode is dark. Light mode via `@media (prefers-color-scheme: light)`.

```css
:root {
  --bg: #262335;
  --surface: #241b2f;
  --surface-elevated: #2e2543;
  --border: rgba(255, 255, 255, 0.08);
  --border-bright: rgba(255, 255, 255, 0.15);
  --text: #ffffff;
  --text-dim: #848bbd;
  --accent: #ff7edb;
  --accent-dim: rgba(255, 126, 219, 0.12);

  --node-a: #36f9f6;
  --node-a-dim: rgba(54, 249, 246, 0.12);
  --node-b: #72f1b8;
  --node-b-dim: rgba(114, 241, 184, 0.12);
  --node-c: #fede5d;
  --node-c-dim: rgba(254, 222, 93, 0.12);

  --green: #72f1b8;
  --green-dim: rgba(114, 241, 184, 0.12);
  --red: #fe4450;
  --red-dim: rgba(254, 68, 80, 0.12);
  --orange: #ff8b39;
  --orange-dim: rgba(255, 139, 57, 0.12);
}

@media (prefers-color-scheme: light) {
  :root {
    --bg: #f5f0ff;
    --surface: #ece4f8;
    --surface-elevated: #ffffff;
    --border: rgba(0, 0, 0, 0.08);
    --border-bright: rgba(0, 0, 0, 0.15);
    --text: #262335;
    --text-dim: #6b6499;
    --accent: #b044a2;
    --accent-dim: rgba(176, 68, 162, 0.10);

    --node-a: #0a8f8d;
    --node-a-dim: rgba(10, 143, 141, 0.10);
    --node-b: #1a8a5a;
    --node-b-dim: rgba(26, 138, 90, 0.10);
    --node-c: #9a7b00;
    --node-c-dim: rgba(154, 123, 0, 0.10);

    --green: #1a8a5a;
    --green-dim: rgba(26, 138, 90, 0.10);
    --red: #c4222e;
    --red-dim: rgba(196, 34, 46, 0.10);
    --orange: #b85a10;
    --orange-dim: rgba(184, 90, 16, 0.10);
  }
}
```

## Mermaid themeVariables

Use with `theme: 'base'` in Mermaid configuration.

```json
{
  "primaryColor": "#241b2f",
  "primaryTextColor": "#ffffff",
  "primaryBorderColor": "#848bbd",
  "secondaryColor": "#ff7edb",
  "secondaryTextColor": "#262335",
  "secondaryBorderColor": "#ff7edb",
  "tertiaryColor": "#262335",
  "tertiaryTextColor": "#ffffff",
  "tertiaryBorderColor": "#848bbd",
  "lineColor": "#848bbd",
  "textColor": "#ffffff",
  "mainBkg": "#241b2f",
  "nodeBorder": "#848bbd",
  "clusterBkg": "#262335",
  "clusterBorder": "#848bbd",
  "titleColor": "#ffffff",
  "edgeLabelBackground": "#262335",
  "nodeTextColor": "#ffffff"
}
```
