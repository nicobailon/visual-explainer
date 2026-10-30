# Visual Explainer MCP server

This directory contains the local Model Context Protocol server for visual-explainer.

## Scope

The server is stdio-only. It is meant for MCP hosts that launch a local child process.
It does not start an HTTP listener, handle credentials, call an LLM, or store output outside the local machine.

Rendered files are written only inside the configured output directory. The default is `~/.agent/diagrams/`. Set `VISUAL_EXPLAINER_OUTPUT_DIR` to move that jail to another directory on the same machine; unset keeps the default path byte-identical. A configured jail must resolve to itself, so symlinked jail paths, including macOS `/tmp`, are rejected before anything is created. The default directory follows a symlinked `~/.agent`. Render targets reject existing symlinks and are written through a temporary file rename. Choose a directory only your user can write; avoid world-writable or group-writable shared folders so another local user cannot replace render targets between validation and write. Filenames must be basenames. Paths, traversal, control characters, and symlink targets are rejected.

A page can hold a state-machine model (`<ve-flow>` with a `<script type="text/plain" model>`), which is code the render runs. The server refuses it unless started with `VISUAL_EXPLAINER_RUN_MODELS=1`. With it set, a page's model runs as Node with this server's permissions, importing from the `root` argument or the server's working directory; set it only when every client that can call the render tool is trusted.

## Run from a package install

```json
{
  "mcpServers": {
    "visual-explainer": {
      "command": "visual-explainer-mcp"
    }
  }
}
```

## Run from a checkout

Install dependencies first:

```bash
npm install --no-package-lock
```

Then point the host at the server entry:

```json
{
  "mcpServers": {
    "visual-explainer": {
      "command": "node",
      "args": ["/absolute/path/to/visual-explainer/plugins/visual-explainer/mcp/server.mjs"]
    }
  }
}
```

## Exposed tools

- `visual_explainer_prepare`: returns a recommended visual explanation flow. It does not write files.
- `visual_explainer_render_html`: validates a complete HTML document and writes it to the configured output directory (default `~/.agent/diagrams/`).

Render defaults to `open: false`. Set `open: true` only when you want the server to request a browser or Glimpse window.

## Exposed prompts

The server exposes the bundled command templates as MCP prompts:

- `generate-web-diagram`
- `generate-visual-plan`
- `generate-slides`
- `generate-video`
- `diff-review`
- `plan-review`
- `project-recap`
- `compare`
- `fact-check`
- `state-machine`

Pass `request` to fill the template's `$@` argument.

## Exposed resources

The server exposes read-only resources for the canonical skill, its references, the kit stylesheet, and command templates:

- `visual-explainer://skill/SKILL.md`
- `visual-explainer://references/*.md`
- `visual-explainer://kit/kit.css`
- `visual-explainer://commands/*.md`
