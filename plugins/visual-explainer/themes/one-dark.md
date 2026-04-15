# One Dark

Dark-first theme based on [Atom's One Dark](https://github.com/atom/one-dark-syntax) syntax theme. Cool blues, warm reds, and muted greens on a neutral dark background.

## CSS Custom Properties

Primary mode is dark. Light mode via `@media (prefers-color-scheme: light)`.

```css
:root {
  --bg: #282c34;
  --surface: #2c313a;
  --surface-elevated: #333842;
  --border: rgba(255, 255, 255, 0.06);
  --border-bright: rgba(255, 255, 255, 0.12);
  --text: #abb2bf;
  --text-dim: #5c6370;
  --accent: #61afef;
  --accent-dim: rgba(97, 175, 239, 0.12);

  --node-a: #61afef;
  --node-a-dim: rgba(97, 175, 239, 0.12);
  --node-b: #98c379;
  --node-b-dim: rgba(152, 195, 121, 0.12);
  --node-c: #c678dd;
  --node-c-dim: rgba(198, 120, 221, 0.12);

  --green: #98c379;
  --green-dim: rgba(152, 195, 121, 0.12);
  --red: #e06c75;
  --red-dim: rgba(224, 108, 117, 0.12);
  --orange: #e5c07b;
  --orange-dim: rgba(229, 192, 123, 0.12);
}

@media (prefers-color-scheme: light) {
  :root {
    --bg: #fafafa;
    --surface: #f0f0f0;
    --surface-elevated: #ffffff;
    --border: rgba(0, 0, 0, 0.08);
    --border-bright: rgba(0, 0, 0, 0.15);
    --text: #383a42;
    --text-dim: #a0a1a7;
    --accent: #4078f2;
    --accent-dim: rgba(64, 120, 242, 0.10);

    --node-a: #4078f2;
    --node-a-dim: rgba(64, 120, 242, 0.10);
    --node-b: #50a14f;
    --node-b-dim: rgba(80, 161, 79, 0.10);
    --node-c: #a626a4;
    --node-c-dim: rgba(166, 38, 164, 0.10);

    --green: #50a14f;
    --green-dim: rgba(80, 161, 79, 0.10);
    --red: #e45649;
    --red-dim: rgba(228, 86, 73, 0.10);
    --orange: #c18401;
    --orange-dim: rgba(193, 132, 1, 0.10);
  }
}
```

## Mermaid themeVariables

Use with `theme: 'base'` in Mermaid configuration.

```json
{
  "primaryColor": "#2c313a",
  "primaryTextColor": "#abb2bf",
  "primaryBorderColor": "#5c6370",
  "secondaryColor": "#61afef",
  "secondaryTextColor": "#282c34",
  "secondaryBorderColor": "#61afef",
  "tertiaryColor": "#282c34",
  "tertiaryTextColor": "#abb2bf",
  "tertiaryBorderColor": "#5c6370",
  "lineColor": "#5c6370",
  "textColor": "#abb2bf",
  "mainBkg": "#2c313a",
  "nodeBorder": "#5c6370",
  "clusterBkg": "#282c34",
  "clusterBorder": "#5c6370",
  "titleColor": "#abb2bf",
  "edgeLabelBackground": "#282c34",
  "nodeTextColor": "#abb2bf"
}
```
