# Dracula

Dark-first theme based on the [official Dracula palette](https://draculatheme.com/spec). Rich purples, pinks, and cyans on a cool dark background. The light variant uses the official Alucard palette.

## CSS Custom Properties

Primary mode is dark. Light mode via `@media (prefers-color-scheme: light)`.

```css
:root {
  --bg: #282a36;
  --surface: #44475a;
  --surface-elevated: #4d5066;
  --border: rgba(255, 255, 255, 0.08);
  --border-bright: rgba(255, 255, 255, 0.15);
  --text: #f8f8f2;
  --text-dim: #6272a4;
  --accent: #bd93f9;
  --accent-dim: rgba(189, 147, 249, 0.12);

  --node-a: #8be9fd;
  --node-a-dim: rgba(139, 233, 253, 0.12);
  --node-b: #50fa7b;
  --node-b-dim: rgba(80, 250, 123, 0.12);
  --node-c: #ff79c6;
  --node-c-dim: rgba(255, 121, 198, 0.12);

  --green: #50fa7b;
  --green-dim: rgba(80, 250, 123, 0.12);
  --red: #ff5555;
  --red-dim: rgba(255, 85, 85, 0.12);
  --orange: #ffb86c;
  --orange-dim: rgba(255, 184, 108, 0.12);
}

@media (prefers-color-scheme: light) {
  :root {
    --bg: #fffbeb;
    --surface: #fff8dc;
    --surface-elevated: #ffffff;
    --border: rgba(0, 0, 0, 0.08);
    --border-bright: rgba(0, 0, 0, 0.15);
    --text: #1f1f1f;
    --text-dim: #6c664b;
    --accent: #644ac9;
    --accent-dim: rgba(100, 74, 201, 0.10);

    --node-a: #036a96;
    --node-a-dim: rgba(3, 106, 150, 0.10);
    --node-b: #14710a;
    --node-b-dim: rgba(20, 113, 10, 0.10);
    --node-c: #a3144d;
    --node-c-dim: rgba(163, 20, 77, 0.10);

    --green: #14710a;
    --green-dim: rgba(20, 113, 10, 0.10);
    --red: #cb3a2a;
    --red-dim: rgba(203, 58, 42, 0.10);
    --orange: #a34d14;
    --orange-dim: rgba(163, 77, 20, 0.10);
  }
}
```

## Mermaid themeVariables

Use with `theme: 'base'` in Mermaid configuration.

```json
{
  "primaryColor": "#44475a",
  "primaryTextColor": "#f8f8f2",
  "primaryBorderColor": "#6272a4",
  "secondaryColor": "#bd93f9",
  "secondaryTextColor": "#f8f8f2",
  "secondaryBorderColor": "#bd93f9",
  "tertiaryColor": "#282a36",
  "tertiaryTextColor": "#f8f8f2",
  "tertiaryBorderColor": "#6272a4",
  "lineColor": "#6272a4",
  "textColor": "#f8f8f2",
  "mainBkg": "#44475a",
  "nodeBorder": "#6272a4",
  "clusterBkg": "#282a36",
  "clusterBorder": "#6272a4",
  "titleColor": "#f8f8f2",
  "edgeLabelBackground": "#282a36",
  "nodeTextColor": "#f8f8f2"
}
```
