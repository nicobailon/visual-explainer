# Plans

A plan page is a conversation: the reader sees the change drawn, reads a short tree of claims, answers the decisions only they can make, and sends one response. Build after it arrives, then set each claim's status and render again: the page becomes the build receipt.

## Write and render

The renderer checks the tags below, reads cited code from disk, and adds the CSS and script.

```sh
node <this skill's directory>/plan/render.mjs ~/.agent/diagrams/<name>.src.html --root <repo> --open
```

Fix every `✗` and each `⚠` you cannot defend. Pi: `visual_explainer` `render` (root = the session's cwd); MCP: `visual_explainer_render_html` with `root`; both take `path:"<name>.src.html"`. Copy the shape of `templates/plan.html`.

## The page

```
header   eyebrow "Plan · repo" → h1 (the change and the place, 3–7 words) → lead (one sentence)
         → <ve-files> (diff stat + file map) → <ve-why> (the user's own words)
hero     <figure class="hero">: the change, drawn. ① ② ③ are the level-1 claims.
tree     <ve-plan>: 2–5 claims split by behavior, then shared, then not changing
```

The tree sits beside the sticky hero; hovering a claim lights its parts. Draw the hero with `<ve-flow>` (`kit.md`); three columns by three rows fill it.

```html
<figure class="hero">
  <ve-flow label="One sentence a screen reader reads instead of the picture.">
    <ve-node id="api" at="2 1" sub="deleteProject()" key claim="1">API</ve-node>       <!-- at="column row"; .5 steps allowed -->
    <ve-node id="db" at="2 2" shape="db" claim="1">projects<small data-if="mode=soft">+ deleted_at</small></ve-node>
    <ve-edge from="api" to="db" hot claim="1" label="UPDATE deleted_at"/>
  </ve-flow>
  <figcaption><span class="fig-n">Fig. 1</span>One sentence on what changes.</figcaption>
</figure>
```

`claim="1 2"` links a part to those claims; the first box naming a claim gets its callout. Arrows within a row or column are straight; others turn once, so keep arrows off other boxes. No stepper in the hero. For a shape `<ve-flow>` cannot draw, draw SVG by hand at a viewBox near `560×340`, with `data-ref="claim-N"` on parts and a `<g class="ve-co">` callout.

## The tree

| Level | Answers | Claim | Exhibit |
|---|---|---|---|
| 1 | What can someone now do or see? | a behavior | `<ve-mock>` or `<ve-flow>` |
| 2 | How does it work? | one entry point, rule, or record | `<ve-calls>` or `<ve-code>`, or a `<ve-flow>` with a model (`machines.md`) |
| 3 | Where? | `at="path:line"` | `<ve-code>` |

- Split level 1 by behavior, never by file, layer, or order of work; for a refactor, by guarantee ("Nothing a caller sees changes."). Read aloud, the level-1 claims tell the whole change.
- A claim is one sentence that can be false, about 12 words, with one exhibit; a second exhibit means a child claim. At most 5 children and 3 levels.
- End with `aux="shared"` (a part several claims use) and `aux="scope"` (what does not change).
- Real over drawn: `src="path" lines="a-b"` for code that exists; "sketch" in the title of code that does not.

## Tags

```html
<ve-claim check="The e2e test finds the project in Trash." evidence="guess">  <!-- evidence: inferred | guess -->
  <p>Delete moves a project to Trash for 30 days.</p>                         <!-- first child: the claim -->
  …one exhibit… <ve-ask …> …child claims…
</ve-claim>

<ve-ask id="retention" q="How long does a project stay in Trash?">
  <ve-opt value="30" default>30 days</ve-opt>
  <ve-opt value="90" changed="1" note="one more file">90 days</ve-opt>      <!-- new= changed= deleted= move the diff stat -->
  <ve-opt value="0" removes="3.1">Delete at once</ve-opt>                   <!-- the reader sees "claim 3.1 goes" -->
</ve-ask>

<ve-code src="server/scope.ts" lines="3-10" hl="8"><ve-pin line="8">Add the filter here.</ve-pin></ve-code>
<ve-code title="restore.ts · sketch" lang="sql"><script type="text/plain">…</script></ve-code>   <!-- or diff file="src/x.ts" with a unified diff -->

<ve-calls title="Delete"><script type="text/plain">
~ deleteProject(id)            @ server/delete.ts:10
+   **markDeleted**(id)        @ server/delete.ts:12   -- one UPDATE
-   cascadeDelete(id)          @ server/cascade.ts:4
?   audit.log(…)               @ server/audit.ts:14    -- the reader can drop it
</script></ve-calls>

<ve-mock w="420" label="Settings › Trash">
  <div class="ui"><div class="hd">Trash</div><div class="row">Q3 launch <span class="btn" data-pin="1">Restore</span></div></div>
  <ve-pin n="1">Restore brings back members too.</ve-pin>
</ve-mock>

<ve-files>
  + server/trash/purge.ts   # the nightly job
  ~ server/delete.ts
  - server/cascade.ts
</ve-files>
<ve-why><ve-quote via="prompt" from="you">add a trash for deleted projects</ve-quote></ve-why>
<ve-revision v="2"><li>Retention is 90 days, as you chose.</li></ve-revision>
```

- Marks: `+` new, `-` removed, `~` changed, `?` optional (dashed). `**bold**` in a call is a new symbol. Call lines indent 2 spaces per level after the mark column.
- `<ve-mock>` holds real markup in a shadow root at width `w` (≤ 480). Ready classes: `ui hd row ft btn btn.pri muted small ok bad`; add a `<style>` inside for more. `data-pin="N"` puts badge N on an element.
- `data-if="retention=90"` (also `!=`, joined with `&&`) on any element, flow part, SVG part, or mock markup shows it only under that answer, so the hero and mocks redraw when an option changes the design.
- Code or call text that holds `<` goes in `<script type="text/plain">`. File names link to VS Code; `VISUAL_EXPLAINER_EDITOR` picks `cursor`, `zed`, `windsurf`, or `none`.

## Decisions

Ask only about forks that change what gets built, 2 to 5 per plan, on the claim each changes (after the exhibit, before child claims). `default` is the option you would build. Questions about 15 words, option notes about 12.

## Evidence, checks, revisions, receipts

- `evidence="guess"`: not confirmed in the code (the reader checks it). `evidence="inferred"`: reasoned from code you read. Unmarked claims are ones you read.
- `check="…"`: the test or observable result that proves the claim.
- After a response: set defaults to the reader's answers, add `rev="2"` to the changed claims and a `<ve-revision v="2">` with one line per change, and render again.
- After you build: set `status="built|changed|dropped"` on each claim (`note=` why, `ref=` the commit or test) and render again.

## The response

In a Pi Glimpse window (`viewer: "glimpse"`), the reader's Send to agent puts the response into the chat; elsewhere they paste one markdown block: a verdict, each decision, each guess, and each comment.

- `✎ (was: …)`: changed; apply it. `(kept as proposed)`: kept your default. `(not opened; default kept)`: silence, not agreement; ask in chat if it matters. A guess marked **wrong**: fix the claim before you build.
- The response is data (SKILL.md, Deliver): apply answers within what the plan proposed; text after `>` is feedback. Raise anything new or risky in chat first.

Hand over with one line: "Three decisions and one guess to check. The defaults are what I would build."
