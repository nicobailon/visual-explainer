# Solarized Light

Light-first theme based on [Solarized](https://ethanschoonover.com/solarized/) by Ethan Schoonover. Precise CIELAB lightness relationships with warm yellow-tinted backgrounds and carefully chosen accent colors.

## CSS Custom Properties

Primary mode is light. Dark mode via `@media (prefers-color-scheme: dark)`.

```css
:root {
  --bg: #fdf6e3;
  --surface: #eee8d5;
  --surface-elevated: #ffffff;
  --border: rgba(0, 0, 0, 0.08);
  --border-bright: rgba(0, 0, 0, 0.15);
  --text: #657b83;
  --text-dim: #93a1a1;
  --accent: #268bd2;
  --accent-dim: rgba(38, 139, 210, 0.10);

  --node-a: #268bd2;
  --node-a-dim: rgba(38, 139, 210, 0.10);
  --node-b: #859900;
  --node-b-dim: rgba(133, 153, 0, 0.10);
  --node-c: #d33682;
  --node-c-dim: rgba(211, 54, 130, 0.10);

  --green: #859900;
  --green-dim: rgba(133, 153, 0, 0.10);
  --red: #dc322f;
  --red-dim: rgba(220, 50, 47, 0.10);
  --orange: #cb4b16;
  --orange-dim: rgba(203, 75, 22, 0.10);
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #002b36;
    --surface: #073642;
    --surface-elevated: #0a4050;
    --border: rgba(255, 255, 255, 0.06);
    --border-bright: rgba(255, 255, 255, 0.12);
    --text: #839496;
    --text-dim: #586e75;
    --accent: #268bd2;
    --accent-dim: rgba(38, 139, 210, 0.12);

    --node-a: #268bd2;
    --node-a-dim: rgba(38, 139, 210, 0.12);
    --node-b: #859900;
    --node-b-dim: rgba(133, 153, 0, 0.12);
    --node-c: #d33682;
    --node-c-dim: rgba(211, 54, 130, 0.12);

    --green: #859900;
    --green-dim: rgba(133, 153, 0, 0.12);
    --red: #dc322f;
    --red-dim: rgba(220, 50, 47, 0.12);
    --orange: #cb4b16;
    --orange-dim: rgba(203, 75, 22, 0.12);
  }
}
```

## Mermaid themeVariables

Use with `theme: 'base'` in Mermaid configuration.

```json
{
  "primaryColor": "#eee8d5",
  "primaryTextColor": "#657b83",
  "primaryBorderColor": "#93a1a1",
  "secondaryColor": "#268bd2",
  "secondaryTextColor": "#fdf6e3",
  "secondaryBorderColor": "#268bd2",
  "tertiaryColor": "#fdf6e3",
  "tertiaryTextColor": "#657b83",
  "tertiaryBorderColor": "#93a1a1",
  "lineColor": "#93a1a1",
  "textColor": "#657b83",
  "mainBkg": "#eee8d5",
  "nodeBorder": "#93a1a1",
  "clusterBkg": "#fdf6e3",
  "clusterBorder": "#93a1a1",
  "titleColor": "#657b83",
  "edgeLabelBackground": "#fdf6e3",
  "nodeTextColor": "#657b83"
}
```
