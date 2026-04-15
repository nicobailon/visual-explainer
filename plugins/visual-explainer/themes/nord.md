# Nord

Dark-first theme based on the [official Nord palette](https://www.nordtheme.com/). An arctic, north-bluish color palette with frost blues and aurora accents. Clean and minimal.

## CSS Custom Properties

Primary mode is dark. Light mode via `@media (prefers-color-scheme: light)`.

```css
:root {
  --bg: #2e3440;
  --surface: #3b4252;
  --surface-elevated: #434c5e;
  --border: rgba(255, 255, 255, 0.06);
  --border-bright: rgba(255, 255, 255, 0.12);
  --text: #eceff4;
  --text-dim: #4c566a;
  --accent: #88c0d0;
  --accent-dim: rgba(136, 192, 208, 0.12);

  --node-a: #88c0d0;
  --node-a-dim: rgba(136, 192, 208, 0.12);
  --node-b: #a3be8c;
  --node-b-dim: rgba(163, 190, 140, 0.12);
  --node-c: #b48ead;
  --node-c-dim: rgba(180, 142, 173, 0.12);

  --green: #a3be8c;
  --green-dim: rgba(163, 190, 140, 0.12);
  --red: #bf616a;
  --red-dim: rgba(191, 97, 106, 0.12);
  --orange: #d08770;
  --orange-dim: rgba(208, 135, 112, 0.12);
}

@media (prefers-color-scheme: light) {
  :root {
    --bg: #eceff4;
    --surface: #e5e9f0;
    --surface-elevated: #ffffff;
    --border: rgba(0, 0, 0, 0.08);
    --border-bright: rgba(0, 0, 0, 0.15);
    --text: #2e3440;
    --text-dim: #4c566a;
    --accent: #5e81ac;
    --accent-dim: rgba(94, 129, 172, 0.10);

    --node-a: #5e81ac;
    --node-a-dim: rgba(94, 129, 172, 0.10);
    --node-b: #a3be8c;
    --node-b-dim: rgba(163, 190, 140, 0.10);
    --node-c: #b48ead;
    --node-c-dim: rgba(180, 142, 173, 0.10);

    --green: #a3be8c;
    --green-dim: rgba(163, 190, 140, 0.10);
    --red: #bf616a;
    --red-dim: rgba(191, 97, 106, 0.10);
    --orange: #d08770;
    --orange-dim: rgba(208, 135, 112, 0.10);
  }
}
```

## Mermaid themeVariables

Use with `theme: 'base'` in Mermaid configuration.

```json
{
  "primaryColor": "#3b4252",
  "primaryTextColor": "#eceff4",
  "primaryBorderColor": "#4c566a",
  "secondaryColor": "#88c0d0",
  "secondaryTextColor": "#2e3440",
  "secondaryBorderColor": "#88c0d0",
  "tertiaryColor": "#2e3440",
  "tertiaryTextColor": "#eceff4",
  "tertiaryBorderColor": "#4c566a",
  "lineColor": "#4c566a",
  "textColor": "#eceff4",
  "mainBkg": "#3b4252",
  "nodeBorder": "#4c566a",
  "clusterBkg": "#2e3440",
  "clusterBorder": "#4c566a",
  "titleColor": "#eceff4",
  "edgeLabelBackground": "#2e3440",
  "nodeTextColor": "#eceff4"
}
```
