## Mermaid

Only when the user asks for it or supplies its source, on kit pages. Put the source where a drawing goes: `<div class="frame"><pre class="mermaid" aria-label="what it shows">flowchart LR …</pre></div>`. The render draws it as plain SVG in the page's colors and fonts, with its own phone layout; no script, config, or theme code. `<br/>` for a line break. It does not step or replay: draw a figure that should move by hand.

## Images

Optional, for a hero or concept art when `surf` or another image tool exists; never for data or structure. Never write base64 yourself: put `<img src="hero.png" alt="…">` in the source and, after each render, run:

```sh
node -e 'const fs=require("fs"),[f,i]=process.argv.slice(1);fs.writeFileSync(f,fs.readFileSync(f,"utf8").replace(`src="${i}"`,`src="data:image/png;base64,${fs.readFileSync(i,"base64")}"`))' <name>.html hero.png
```

## Older recipes

Fetch only for mechanics; keep this skill's look: `https://raw.githubusercontent.com/nicobailon/visual-explainer/v0.11.0/plugins/visual-explainer/` + `references/css-patterns.md` · `references/libraries.md` (Chart.js, anime.js) · `references/slide-patterns.md` · `templates/architecture.html` · `templates/data-table.html`.
