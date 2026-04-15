# Gruvbox Light

Light-first theme based on [Gruvbox](https://github.com/morhetz/gruvbox). Retro groove colors with warm, creamy backgrounds and earthy faded accent tones.

## CSS Custom Properties

Primary mode is light. Dark mode via `@media (prefers-color-scheme: dark)`.

```css
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

@media (prefers-color-scheme: dark) {
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
}
```

## Mermaid themeVariables

Use with `theme: 'base'` in Mermaid configuration.

```json
{
  "primaryColor": "#ebdbb2",
  "primaryTextColor": "#3c3836",
  "primaryBorderColor": "#7c6f64",
  "secondaryColor": "#af3a03",
  "secondaryTextColor": "#fbf1c7",
  "secondaryBorderColor": "#af3a03",
  "tertiaryColor": "#fbf1c7",
  "tertiaryTextColor": "#3c3836",
  "tertiaryBorderColor": "#7c6f64",
  "lineColor": "#7c6f64",
  "textColor": "#3c3836",
  "mainBkg": "#ebdbb2",
  "nodeBorder": "#7c6f64",
  "clusterBkg": "#fbf1c7",
  "clusterBorder": "#7c6f64",
  "titleColor": "#3c3836",
  "edgeLabelBackground": "#fbf1c7",
  "nodeTextColor": "#3c3836"
}
```
