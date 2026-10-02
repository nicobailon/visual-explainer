# Themes and runtime picker

Use this only when the user asks for switchable themes or fonts, or names a palette. Otherwise, commit to one palette.

A theme is one fixed palette, not a light/dark pair. The picker is the reader's light/dark control. Do not wrap theme values in `prefers-color-scheme`.

## Palettes

Columns map to tokens. `-dim` variants are the same hex at about 12% alpha (`#rrggbb1f`). Use `rgba(255,255,255,.08)` for `--border` on dark themes and `rgba(0,0,0,.08)` on light themes.

Text tokens (`--text --text-dim --accent --ok --warn --risk --info`) reach 4.5:1 on both `--bg` and `--surface`. Where a palette's own value failed, it is lifted toward the text color. `--node-a/b/c` are the canonical palette values: use them for fills, strokes, and chip markers, not for text. Set `--border-bright` to the `--text-dim` value, so diagram outlines and control borders reach 3:1.

| id | mode | --bg | --surface | --text | --text-dim | --accent | --node-a | --node-b | --node-c | --ok | --warn | --risk | --info |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| dracula | dark | #282a36 | #44475a | #f8f8f2 | #adb6d0 | #caa8fa | #8be9fd | #50fa7b | #ff79c6 | #50fa7b | #ffb86c | #ff9b9b | #8be9fd |
| nord | dark | #2e3440 | #3b4252 | #eceff4 | #a9aeb7 | #88c0d0 | #88c0d0 | #a3be8c | #b48ead | #a3be8c | #daa08e | #d89fa4 | #88c0d0 |
| one-dark | dark | #282c34 | #2c313a | #abb2bf | #9398a1 | #61afef | #61afef | #98c379 | #c678dd | #98c379 | #e5c07b | #e37981 | #61afef |
| catppuccin-mocha | dark | #1e1e2e | #313244 | #cdd6f4 | #989baa | #cba6f7 | #89b4fa | #a6e3a1 | #f5c2e7 | #a6e3a1 | #fab387 | #f38ba8 | #89b4fa |
| tokyo-night | dark | #1a1b26 | #24283b | #a9b1d6 | #898fac | #7aa2f7 | #7aa2f7 | #9ece6a | #bb9af7 | #9ece6a | #ff9e64 | #f7768e | #7aa2f7 |
| gruvbox-dark | dark | #282828 | #3c3836 | #ebdbb2 | #afa18e | #fe8019 | #83a598 | #b8bb26 | #d3869b | #b8bb26 | #fe8019 | #fc7c6d | #88a99c |
| synthwave-84 | dark | #262335 | #241b2f | #ffffff | #848bbd | #ff7edb | #36f9f6 | #72f1b8 | #fede5d | #72f1b8 | #ff8b39 | #fe4652 | #36f9f6 |
| solarized-light | light | #fdf6e3 | #eee8d5 | #526970 | #526970 | #00629b | #00629b | #859900 | #d33682 | #606e00 | #b54314 | #c42d2a | #00629b |
| github-light | light | #ffffff | #f6f8fa | #1f2328 | #656d76 | #0969da | #0969da | #1a7f37 | #8250df | #1a7f37 | #bc4c00 | #cf222e | #0969da |
| catppuccin-latte | light | #eff1f5 | #ccd0da | #4c4f69 | #54565f | #7230c9 | #1e66f5 | #40a02b | #ea76cb | #29661c | #983c07 | #b30d30 | #1851c2 |
| gruvbox-light | light | #fbf1c7 | #ebdbb2 | #3c3836 | #6b5f56 | #ad3903 | #076678 | #79740e | #8f3f71 | #67630c | #ad3903 | #9d0006 | #076678 |

Font pairs (id → body / mono): `dm` DM Sans / Fira Code · `instrument` Instrument Sans / JetBrains Mono · `plex` IBM Plex Sans / IBM Plex Mono · `bricolage` Bricolage Grotesque / JetBrains Mono · `jakarta` Plus Jakarta Sans / Azeret Mono. Load all of them in one Google Fonts link, at every weight the page uses. A display serif for headings goes in its own `--font-display` and does not change with the picker.

## Picker contract

- Put one fixed bar at the top right: theme dots (fill `--surface`, ring `--accent`), a divider, then `Aa` font chips, each set in its own family. Every control uses `aria-pressed`.
- Build the dots and chips from the `THEMES` / `FONT_PAIRS` data. Never hand-write them, so a control cannot drift from the value it sets.
- Put the default theme and font in `:root` as plain CSS. Then the page renders correctly without JS, and you do not need to apply anything on load.
- `applyTheme(id)` sets every column above, including the status colors and `--border-bright`, with `root.style.setProperty`. `applyFont(id)` sets `--font-body` and `--font-mono`. Both are `async`, update `aria-pressed`, and then redraw anything that baked colors or measured text, such as a canvas chart.
- Rules must read fonts only through `var(--font-body)` and `var(--font-mono)`.
- Draw the active ring in `var(--text)`, not white, because white disappears on light themes. Give every control a focus ring. Hide the bar in print.
- Declare `DEFAULT_THEME`, `DEFAULT_FONT`, and the active state before any script that reads them. `let` and `const` are not hoisted.

## Project defaults

`visual-explainer.config.md` (harness-neutral) can set `theme:` and `font:` to the ids above. In Claude Code, `.claude/visual-explainer.local.md` overrides it only for personal preferences. Both only seed the defaults. The reader can still switch, and an unknown value falls back to the page's own choice.
