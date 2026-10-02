# Themes and runtime picker

Use this only when the user asks for switchable themes or fonts, or names a palette. Otherwise, commit to one palette.

A theme is one fixed palette, not a light/dark pair. The picker is the reader's light/dark control. Do not wrap theme values in `prefers-color-scheme`.

## Palettes

Columns map to tokens. `-dim` variants are the same hex at about 12% alpha (`#rrggbb1f`). Use `rgba(255,255,255,.08)` for `--border` on dark themes and `rgba(0,0,0,.08)` on light themes.

| id | mode | --bg | --surface | --text | --text-dim | --accent | --node-a | --node-b | --node-c | --green | --red | --orange |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| dracula | dark | #282a36 | #44475a | #f8f8f2 | #6272a4 | #bd93f9 | #8be9fd | #50fa7b | #ff79c6 | #50fa7b | #ff5555 | #ffb86c |
| nord | dark | #2e3440 | #3b4252 | #eceff4 | #4c566a | #88c0d0 | #88c0d0 | #a3be8c | #b48ead | #a3be8c | #bf616a | #d08770 |
| one-dark | dark | #282c34 | #2c313a | #abb2bf | #5c6370 | #61afef | #61afef | #98c379 | #c678dd | #98c379 | #e06c75 | #e5c07b |
| catppuccin-mocha | dark | #1e1e2e | #313244 | #cdd6f4 | #6c7086 | #cba6f7 | #89b4fa | #a6e3a1 | #f5c2e7 | #a6e3a1 | #f38ba8 | #fab387 |
| tokyo-night | dark | #1a1b26 | #24283b | #a9b1d6 | #565f89 | #7aa2f7 | #7aa2f7 | #9ece6a | #bb9af7 | #9ece6a | #f7768e | #ff9e64 |
| gruvbox-dark | dark | #282828 | #3c3836 | #ebdbb2 | #a89984 | #fe8019 | #83a598 | #b8bb26 | #d3869b | #b8bb26 | #fb4934 | #fe8019 |
| synthwave-84 | dark | #262335 | #241b2f | #ffffff | #848bbd | #ff7edb | #36f9f6 | #72f1b8 | #fede5d | #72f1b8 | #fe4450 | #ff8b39 |
| solarized-light | light | #fdf6e3 | #eee8d5 | #526970 | #526970 | #00629b | #00629b | #859900 | #d33682 | #859900 | #dc322f | #cb4b16 |
| github-light | light | #ffffff | #f6f8fa | #1f2328 | #656d76 | #0969da | #0969da | #1a7f37 | #8250df | #1a7f37 | #cf222e | #bc4c00 |
| catppuccin-latte | light | #eff1f5 | #ccd0da | #4c4f69 | #9ca0b0 | #8839ef | #1e66f5 | #40a02b | #ea76cb | #40a02b | #d20f39 | #fe640b |
| gruvbox-light | light | #fbf1c7 | #ebdbb2 | #3c3836 | #7c6f64 | #af3a03 | #076678 | #79740e | #8f3f71 | #79740e | #9d0006 | #af3a03 |

Font pairs (id → body / mono): `dm` DM Sans / Fira Code · `instrument` Instrument Sans / JetBrains Mono · `plex` IBM Plex Sans / IBM Plex Mono · `bricolage` Bricolage Grotesque / JetBrains Mono · `jakarta` Plus Jakarta Sans / Azeret Mono. Load all of them in one Google Fonts link, at every weight the page uses. A display serif for headings goes in its own `--font-display` and does not change with the picker.

## Picker contract

```
┌ picker-bar (fixed, top-right) ─────────────────────┐
│ ● ● ● ● ● ● ● ● ● ● ●   │  Aa Aa Aa Aa Aa           │
│ theme dots: fill=surface │  font chips: set in own   │
│ ring=accent, aria-pressed│  family, aria-pressed     │
└────────────────────────────────────────────────────┘
```

- Build the dots and chips from the `THEMES` / `FONT_PAIRS` data. Never hand-write them, so a control cannot drift from the value it sets.
- Put the default theme and font in `:root` as plain CSS. Then the page renders correctly without JS, and you do not need to apply anything on load.
- `applyTheme(id)` sets each token with `root.style.setProperty`. `applyFont(id)` sets `--font-body` and `--font-mono`. Both are `async`, update `aria-pressed`, and then `await window.rerenderDiagrams()` (`mermaid.md`). Re-render after a font change too, because Mermaid measures labels at render time.
- Rules must read fonts only through `var(--font-body)` and `var(--font-mono)`.
- Draw the active ring in `var(--text)`, not white, because white disappears on light themes. Give every control a focus ring. Hide the bar in print.
- Declare `DEFAULT_THEME`, `DEFAULT_FONT`, and the active state before the Mermaid init that reads them. `let` and `const` are not hoisted.

## Project defaults

`visual-explainer.config.md` (harness-neutral) can set `theme:` and `font:` to the ids above. In Claude Code, `.claude/visual-explainer.local.md` overrides it only for personal preferences. Both only seed the defaults. The reader can still switch, and an unknown value falls back to the page's own choice.
