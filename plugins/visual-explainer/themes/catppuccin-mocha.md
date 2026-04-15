# Catppuccin Mocha

Dark-first theme based on [Catppuccin Mocha](https://catppuccin.com/palette/). Soothing pastel colors on a deep, warm dark background. The darkest of the four Catppuccin flavors.

## CSS Custom Properties

Primary mode is dark. Light mode via `@media (prefers-color-scheme: light)`.

```css
:root {
  --bg: #1e1e2e;
  --surface: #313244;
  --surface-elevated: #45475a;
  --border: rgba(255, 255, 255, 0.06);
  --border-bright: rgba(255, 255, 255, 0.12);
  --text: #cdd6f4;
  --text-dim: #6c7086;
  --accent: #cba6f7;
  --accent-dim: rgba(203, 166, 247, 0.12);

  --node-a: #89b4fa;
  --node-a-dim: rgba(137, 180, 250, 0.12);
  --node-b: #a6e3a1;
  --node-b-dim: rgba(166, 227, 161, 0.12);
  --node-c: #f5c2e7;
  --node-c-dim: rgba(245, 194, 231, 0.12);

  --green: #a6e3a1;
  --green-dim: rgba(166, 227, 161, 0.12);
  --red: #f38ba8;
  --red-dim: rgba(243, 139, 168, 0.12);
  --orange: #fab387;
  --orange-dim: rgba(250, 179, 135, 0.12);
}

@media (prefers-color-scheme: light) {
  :root {
    --bg: #eff1f5;
    --surface: #ccd0da;
    --surface-elevated: #ffffff;
    --border: rgba(0, 0, 0, 0.08);
    --border-bright: rgba(0, 0, 0, 0.15);
    --text: #4c4f69;
    --text-dim: #9ca0b0;
    --accent: #8839ef;
    --accent-dim: rgba(136, 57, 239, 0.10);

    --node-a: #1e66f5;
    --node-a-dim: rgba(30, 102, 245, 0.10);
    --node-b: #40a02b;
    --node-b-dim: rgba(64, 160, 43, 0.10);
    --node-c: #ea76cb;
    --node-c-dim: rgba(234, 118, 203, 0.10);

    --green: #40a02b;
    --green-dim: rgba(64, 160, 43, 0.10);
    --red: #d20f39;
    --red-dim: rgba(210, 15, 57, 0.10);
    --orange: #fe640b;
    --orange-dim: rgba(254, 100, 11, 0.10);
  }
}
```

## Mermaid themeVariables

Use with `theme: 'base'` in Mermaid configuration.

```json
{
  "primaryColor": "#313244",
  "primaryTextColor": "#cdd6f4",
  "primaryBorderColor": "#6c7086",
  "secondaryColor": "#cba6f7",
  "secondaryTextColor": "#1e1e2e",
  "secondaryBorderColor": "#cba6f7",
  "tertiaryColor": "#1e1e2e",
  "tertiaryTextColor": "#cdd6f4",
  "tertiaryBorderColor": "#6c7086",
  "lineColor": "#6c7086",
  "textColor": "#cdd6f4",
  "mainBkg": "#313244",
  "nodeBorder": "#6c7086",
  "clusterBkg": "#1e1e2e",
  "clusterBorder": "#6c7086",
  "titleColor": "#cdd6f4",
  "edgeLabelBackground": "#1e1e2e",
  "nodeTextColor": "#cdd6f4"
}
```
