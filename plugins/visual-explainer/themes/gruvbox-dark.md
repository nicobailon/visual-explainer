# Gruvbox Dark

Dark-first theme based on [Gruvbox](https://github.com/morhetz/gruvbox). Retro groove colors with warm earthy tones — oranges, yellows, and greens on a dark brown background.

## CSS Custom Properties

Primary mode is dark. Light mode via `@media (prefers-color-scheme: light)`.

```css
:root {
  --bg: #282828;
  --surface: #3c3836;
  --surface-elevated: #504945;
  --border: rgba(255, 255, 255, 0.06);
  --border-bright: rgba(255, 255, 255, 0.12);
  --text: #ebdbb2;
  --text-dim: #a89984;
  --accent: #fe8019;
  --accent-dim: rgba(254, 128, 25, 0.12);

  --node-a: #83a598;
  --node-a-dim: rgba(131, 165, 152, 0.12);
  --node-b: #b8bb26;
  --node-b-dim: rgba(184, 187, 38, 0.12);
  --node-c: #d3869b;
  --node-c-dim: rgba(211, 134, 155, 0.12);

  --green: #b8bb26;
  --green-dim: rgba(184, 187, 38, 0.12);
  --red: #fb4934;
  --red-dim: rgba(251, 73, 52, 0.12);
  --orange: #fe8019;
  --orange-dim: rgba(254, 128, 25, 0.12);
}

@media (prefers-color-scheme: light) {
  :root {
    --bg: #fbf1c7;
    --surface: #ebdbb2;
    --surface-elevated: #ffffff;
    --border: rgba(0, 0, 0, 0.08);
    --border-bright: rgba(0, 0, 0, 0.15);
    --text: #3c3836;
    --text-dim: #7c6f64;
    --accent: #af3a03;
    --accent-dim: rgba(175, 58, 3, 0.10);

    --node-a: #076678;
    --node-a-dim: rgba(7, 102, 120, 0.10);
    --node-b: #79740e;
    --node-b-dim: rgba(121, 116, 14, 0.10);
    --node-c: #8f3f71;
    --node-c-dim: rgba(143, 63, 113, 0.10);

    --green: #79740e;
    --green-dim: rgba(121, 116, 14, 0.10);
    --red: #9d0006;
    --red-dim: rgba(157, 0, 6, 0.10);
    --orange: #af3a03;
    --orange-dim: rgba(175, 58, 3, 0.10);
  }
}
```

## Mermaid themeVariables

Use with `theme: 'base'` in Mermaid configuration.

```json
{
  "primaryColor": "#3c3836",
  "primaryTextColor": "#ebdbb2",
  "primaryBorderColor": "#a89984",
  "secondaryColor": "#fe8019",
  "secondaryTextColor": "#282828",
  "secondaryBorderColor": "#fe8019",
  "tertiaryColor": "#282828",
  "tertiaryTextColor": "#ebdbb2",
  "tertiaryBorderColor": "#a89984",
  "lineColor": "#a89984",
  "textColor": "#ebdbb2",
  "mainBkg": "#3c3836",
  "nodeBorder": "#a89984",
  "clusterBkg": "#282828",
  "clusterBorder": "#a89984",
  "titleColor": "#ebdbb2",
  "edgeLabelBackground": "#282828",
  "nodeTextColor": "#ebdbb2"
}
```
