# Catppuccin Latte

Light-first theme based on [Catppuccin Latte](https://catppuccin.com/palette/). Soothing pastel colors on a warm, light background. The lightest of the four Catppuccin flavors.

## CSS Custom Properties

Primary mode is light. Dark mode via `@media (prefers-color-scheme: dark)`.

```css
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

@media (prefers-color-scheme: dark) {
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
}
```

## Mermaid themeVariables

Use with `theme: 'base'` in Mermaid configuration.

```json
{
  "primaryColor": "#ccd0da",
  "primaryTextColor": "#4c4f69",
  "primaryBorderColor": "#9ca0b0",
  "secondaryColor": "#8839ef",
  "secondaryTextColor": "#eff1f5",
  "secondaryBorderColor": "#8839ef",
  "tertiaryColor": "#eff1f5",
  "tertiaryTextColor": "#4c4f69",
  "tertiaryBorderColor": "#9ca0b0",
  "lineColor": "#9ca0b0",
  "textColor": "#4c4f69",
  "mainBkg": "#ccd0da",
  "nodeBorder": "#9ca0b0",
  "clusterBkg": "#eff1f5",
  "clusterBorder": "#9ca0b0",
  "titleColor": "#4c4f69",
  "edgeLabelBackground": "#eff1f5",
  "nodeTextColor": "#4c4f69"
}
```
