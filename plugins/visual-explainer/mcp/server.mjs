#!/usr/bin/env node
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import { prepareRenderedHtml, readSourcePath, renderPageForHost, reportLine, reportPage } from "../kit/render.mjs";
import { lookAt, lookLines } from "../kit/look.mjs";

const serverPath = fileURLToPath(import.meta.url);
const mcpDir = dirname(serverPath);
const skillDir = dirname(mcpDir);
const rootDir = join(skillDir, "..", "..");
const packageJson = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf8"));

const viewerSchema = z.enum(["browser", "glimpse", "auto"]);
const openStatusSchema = z.enum(["disabled", "unsupported", "dispatched", "failed"]);
const openTargetSchema = z.enum(["browser", "glimpse"]);

const prepareInputSchema = z.object({
  topic: z.string().min(1).describe("What the visual explanation should cover."),
  goal: z.string().optional().describe("What the user wants to understand, decide, or communicate."),
  files: z.array(z.string()).optional().describe("Relevant files or paths the host model should inspect."),
  audience: z.string().optional().describe("Intended audience, such as developer, PM, team, reviewer, or executive."),
}).strict();

const prepareOutputSchema = z.object({
  topic: z.string(),
  goal: z.string().optional(),
  audience: z.string().optional(),
  files: z.array(z.string()),
  recommendedFlow: z.array(z.string()),
});

const renderInputSchema = z.object({
  filename: z.string().min(1).optional().describe("With html: basename filename; .html is appended when missing."),
  html: z.string().min(1).optional().describe("Page source or complete HTML, when you cannot write a path."),
  path: z.string().min(1).optional().describe("Instead of html: a <name>.src.html file in the output directory."),
  root: z.string().min(1).optional().describe("The repository a plan source (<ve-plan> tags) checks its citations against, and a page's <ve-flow> model imports from. Defaults to the server's working directory."),
  open: z.boolean().default(false).describe("Open the written file after rendering. Defaults to false for MCP."),
  viewer: viewerSchema.default("browser").describe("Viewer to use when open is true."),
}).strict();

const renderOutputSchema = z.object({
  path: z.string(),
  viewer: viewerSchema,
  openAttempted: z.boolean(),
  openStatus: openStatusSchema,
  openTarget: openTargetSchema.optional(),
  openError: z.string().optional(),
  fallbackFrom: openTargetSchema.optional(),
  fallbackError: z.string().optional(),
  source: z.string().optional(),
  report: z.object({ figures: z.number(), uncaptioned: z.number(), dataTags: z.number(), flows: z.number(), proseWords: z.number(), machines: z.array(z.string()).optional() }).optional(),
});

const promptArgsSchema = z.object({
  request: z.string().optional().describe("User-supplied prompt arguments. This replaces $@ in the bundled command template."),
}).strict();

const promptFiles = [
  "compare.md",
  "diff-review.md",
  "fact-check.md",
  "generate-slides.md",
  "generate-video.md",
  "generate-visual-plan.md",
  "generate-web-diagram.md",
  "plan-review.md",
  "project-recap.md",
  "state-machine.md",
];

const resourceFiles = [
  { name: "skill", uri: "visual-explainer://skill/SKILL.md", path: "SKILL.md", title: "Visual Explainer Skill", mimeType: "text/markdown" },
  // every reference the skill points to, so a client with no file access can still read them
  { name: "kit-css", uri: "visual-explainer://kit/kit.css", path: "kit/kit.css", title: "Kit stylesheet", mimeType: "text/css" },
  ...(existsSync(join(skillDir, "references")) ? readdirSync(join(skillDir, "references")) : []).filter((file) => file.endsWith(".md")).sort().map((file) => (
    { name: `reference-${file.slice(0, -3)}`, uri: `visual-explainer://references/${file}`, path: `references/${file}`, title: `Reference: ${file}`, mimeType: "text/markdown" }
  )),
];

function readSkillFile(relativePath) {
  return readFileSync(join(skillDir, relativePath), "utf8");
}

function parsePromptFile(relativePath) {
  const text = readSkillFile(relativePath);
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    const name = relativePath.split("/").pop()?.replace(/\.md$/, "") ?? relativePath;
    return { name, description: `Visual Explainer prompt from ${relativePath}.`, body: text };
  }

  const frontmatter = match[1];
  const body = match[2];
  const name = frontmatter.match(/^name:\s*(.+)$/m)?.[1]?.trim() ?? relativePath.split("/").pop()?.replace(/\.md$/, "") ?? relativePath;
  const description = frontmatter.match(/^description:\s*(.+)$/m)?.[1]?.trim() ?? `Visual Explainer prompt from ${relativePath}.`;
  return { name, description, body };
}

function outputFilename(input) {
  if (/[\0-\x1f\x7f]/.test(input)) throw new Error("filename must not contain control characters");

  const raw = input.replace(/^@/, "").trim();

  if (!raw) throw new Error("filename is required");
  if (raw.includes("/") || raw.includes("\\")) throw new Error("filename must be a basename, not a path");
  if (raw.includes("..")) throw new Error("filename must not contain '..'");

  return /\.html?$/i.test(raw) ? raw : `${raw}.html`;
}

function resolveOutputDirectory() {
  const configured = process.env.VISUAL_EXPLAINER_OUTPUT_DIR?.trim();
  return {
    path: configured ? resolve(configured) : join(homedir(), ".agent", "diagrams"),
    configured: Boolean(configured),
  };
}

// Checks the nearest existing ancestor, so a rejected directory is never created through a symlink.
function assertResolvesToItself(path) {
  let existing = path;
  // A missing Windows drive or UNC root is its own dirname; stop there and let realpathSync throw.
  while (!lstatSync(existing, { throwIfNoEntry: false }) && dirname(existing) !== existing) existing = dirname(existing);
  const resolved = join(realpathSync(existing), relative(existing, path));
  if (resolved !== path) throw new Error(`${path} must not contain symlinks and must resolve to itself (it resolves to ${resolved})`);
}

function assertOutputPathContained(resolvedDir, outputPath) {
  const resolvedPath = resolve(outputPath);
  const dirPrefix = resolvedDir.endsWith(sep) ? resolvedDir : `${resolvedDir}${sep}`;
  if (resolvedPath !== resolvedDir && !resolvedPath.startsWith(dirPrefix)) {
    throw new Error(`${outputPath} must stay inside ${resolvedDir}`);
  }
}

function writeRenderedFile(outputPath, html) {
  const temporaryPath = `${outputPath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporaryPath, html, { encoding: "utf8", flag: "wx", mode: 0o666 });
    renameSync(temporaryPath, outputPath);
  } catch (error) {
    throw error;
  } finally {
    rmSync(temporaryPath, { force: true });
  }
}

function assertHtmlDocument(html) {
  const trimmed = html.trim();
  if (!trimmed) throw new Error("html is required");

  const start = trimmed.replace(/^\s*<!doctype\s+html\b[^>]*>\s*/i, "").replace(/^(?:<!--[\s\S]*?-->\s*)+/, "");
  if (!/^<html[\s>]/i.test(start) || !/<\/html>\s*$/i.test(trimmed)) {
    throw new Error("html must be a complete HTML document starting with <!doctype html> or <html> and ending with </html>");
  }
}

function runOpener(command, args, openTarget) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { detached: true, stdio: "ignore", windowsHide: true });
    let settled = false;

    const settle = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    child.once("error", (error) => {
      settle({
        openAttempted: true,
        openStatus: "failed",
        openTarget,
        openError: error.message,
      });
    });

    child.once("exit", (code, signal) => {
      if (code !== 0) {
        settle({
          openAttempted: true,
          openStatus: "failed",
          openTarget,
          openError: code === null ? `opener exited with signal ${signal ?? "unknown"}` : `opener exited with code ${code}`,
        });
      }
    });

    const timer = setTimeout(() => {
      settle({ openAttempted: true, openStatus: "dispatched", openTarget });
    }, 250);

    child.unref();
  });
}

async function openInBrowser(path) {
  if (process.platform === "darwin") return await runOpener("open", [path], "browser");
  if (process.platform === "linux") return await runOpener("xdg-open", [path], "browser");
  if (process.platform === "win32") return await runOpener("cmd", ["/c", "start", "", path], "browser");
  return { openAttempted: false, openStatus: "unsupported", openTarget: "browser" };
}

async function openInGlimpse(path) {
  return await runOpener("glimpseui", ["--width", "1200", "--height", "900", "--title", "Visual Explainer", "--open-links", path], "glimpse");
}

async function openRenderedPage(path, viewer) {
  if (viewer === "browser") return await openInBrowser(path);
  if (viewer === "glimpse") return await openInGlimpse(path);

  const glimpseResult = await openInGlimpse(path);
  if (glimpseResult.openStatus !== "failed") return glimpseResult;

  const browserResult = await openInBrowser(path);
  return {
    ...browserResult,
    fallbackFrom: "glimpse",
    fallbackError: glimpseResult.openError ?? "glimpseui failed",
  };
}

function compact(value) {
  return Object.fromEntries(Object.entries(value).filter((entry) => entry[1] !== undefined));
}

function renderToolResult(message, structuredContent, images = []) {
  return {
    content: [{ type: "text", text: message }, ...images],
    structuredContent: compact(structuredContent),
  };
}

function renderToolError(error) {
  return {
    content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }],
    isError: true,
  };
}

function prepareVisualExplanation(params) {
  const topic = params.topic.trim();
  if (!topic) throw new Error("topic is required");

  const goal = params.goal?.trim();
  const audience = params.audience?.trim();
  const files = params.files?.map((file) => file.trim()).filter(Boolean) ?? [];
  const recommendedFlow = [
    "Choose the page shape with the visual-explainer prompts and skill resources.",
    "Gather and verify the facts yourself; the server does not call an LLM.",
    "Write <name>.src.html in the output directory and call visual_explainer_render_html with path (without file access: html and filename).",
    "The server writes only inside its output directory (default ~/.agent/diagrams/).",
  ];

  const structuredContent = { topic, goal, audience, files, recommendedFlow };
  const message = [
    `Prepared visual explanation for: ${topic}`,
    goal ? `Goal: ${goal}` : undefined,
    audience ? `Audience: ${audience}` : undefined,
    files.length ? `Starting files: ${files.join(", ")}` : undefined,
    "Recommended flow:",
    ...recommendedFlow.map((step, index) => `${index + 1}. ${step}`),
  ].filter(Boolean).join("\n");

  return renderToolResult(message, structuredContent);
}

async function writeRenderedHtml(filenameInput, htmlInput, open, viewer, planRoot, sourcePath) {
  assertHtmlDocument(htmlInput);
  // MCP cannot put the reader's reply into the chat, so plan and kit pages here always copy it instead (no sendBack).
  // a <ve-flow> model runs the repo's code, so a client can only make this server run one when its operator opted in
  const page = renderPageForHost(htmlInput, { root: planRoot, filename: outputFilename(filenameInput), models: process.env.VISUAL_EXPLAINER_RUN_MODELS === "1" });
  // a plan page has its own summary in its note; every other page gets the report
  const report = page ? page.report : reportPage(htmlInput);
  const filename = page?.filename ?? outputFilename(filenameInput);
  const html = prepareRenderedHtml(page ? page.html : htmlInput);
  const { path: outputDir, configured } = resolveOutputDirectory();
  const outputPath = join(outputDir, filename);

  const outputDirStatus = lstatSync(outputDir, { throwIfNoEntry: false });
  if (outputDirStatus?.isSymbolicLink()) throw new Error(`${outputDir} must not be a symlink`);
  if (configured) assertResolvesToItself(outputDir);
  mkdirSync(outputDir, { recursive: true });
  if (configured) assertResolvesToItself(outputDir);
  const resolvedDir = realpathSync(outputDir);
  assertOutputPathContained(resolvedDir, join(resolvedDir, filename));

  const outputStatus = lstatSync(outputPath, { throwIfNoEntry: false });
  if (outputStatus?.isSymbolicLink()) throw new Error(`${outputPath} must not be a symlink`);

  // Keep the source beside the page: revisions and build receipts are small edits to it, then a new render.
  // The source goes first, so a failed write never leaves a new page beside an old source. A source read from path stays as it is.
  const source = sourcePath ?? (page?.source ? join(outputDir, page.source) : undefined);
  if (source && !sourcePath) {
    if (lstatSync(source, { throwIfNoEntry: false })?.isSymbolicLink()) throw new Error(`${source} must not be a symlink`);
    writeRenderedFile(source, htmlInput);
  }
  writeRenderedFile(outputPath, html);
  // a kit page is looked at in a browser, and its sheet comes back with the report, so the agent never scripts its own screenshots
  const looked = page?.kit ? await lookAt(outputPath) : undefined;

  const openResult = open ? await openRenderedPage(outputPath, viewer) : { openAttempted: false, openStatus: "disabled" };
  let message = `Wrote ${outputPath}.`;
  if (openResult.openStatus === "dispatched") {
    message += ` ${openResult.openTarget === "glimpse" ? "Glimpse" : "Browser"} open requested.`;
  } else if (openResult.openStatus === "failed") {
    message += ` ${openResult.openTarget === "glimpse" ? "Glimpse" : "Browser"} open failed: ${openResult.openError ?? "unknown error"}.`;
  } else if (openResult.openStatus === "unsupported") {
    message += " Browser opening is unsupported on this platform.";
  }
  if (openResult.fallbackFrom === "glimpse") {
    message += ` Glimpse fallback reason: ${openResult.fallbackError ?? "unknown error"}.`;
  }
  if (page) message += page.note;
  if (report) message += `\n${reportLine(report)}`;
  if (looked) message += `\n${lookLines(looked).join("\n")}`;
  const images = (looked?.sheets ?? []).map((sheet) => ({ type: "image", data: readFileSync(sheet).toString("base64"), mimeType: "image/png" }));

  return { message, output: compact({ path: outputPath, viewer, ...openResult, source, report }), images };
}

function registerResources(server) {
  for (const resource of resourceFiles) {
    server.registerResource(resource.name, resource.uri, {
      title: resource.title,
      description: `Bundled visual-explainer resource: ${resource.path}`,
      mimeType: resource.mimeType,
    }, async (uri) => ({
      contents: [{ uri: uri.href, mimeType: resource.mimeType, text: readSkillFile(resource.path) }],
    }));
  }

  for (const file of promptFiles) {
    const relativePath = `commands/${file}`;
    const prompt = parsePromptFile(relativePath);
    server.registerResource(`command-${prompt.name}`, `visual-explainer://commands/${file}`, {
      title: `/${prompt.name}`,
      description: prompt.description,
      mimeType: "text/markdown",
    }, async (uri) => ({
      contents: [{ uri: uri.href, mimeType: "text/markdown", text: readSkillFile(relativePath) }],
    }));
  }
}

function registerPrompts(server) {
  for (const file of promptFiles) {
    const prompt = parsePromptFile(`commands/${file}`);
    server.registerPrompt(prompt.name, {
      title: `/${prompt.name}`,
      description: prompt.description,
      argsSchema: promptArgsSchema,
    }, ({ request }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: prompt.body.replaceAll("$@", request ?? "").trim(),
        },
      }],
    }));
  }
}

function registerTools(server) {
  server.registerTool("visual_explainer_prepare", {
    title: "Prepare Visual Explainer",
    description: "Plan a visual explanation. Does not call an LLM or write files.",
    inputSchema: prepareInputSchema,
    outputSchema: prepareOutputSchema,
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  }, async (params) => {
    try {
      return prepareVisualExplanation(params);
    } catch (error) {
      return renderToolError(error);
    }
  });

  server.registerTool("visual_explainer_render_html", {
    title: "Render Visual Explainer HTML",
    description: "Render a page source (path) or HTML to the configured output directory (default ~/.agent/diagrams/). Does not call an LLM.",
    inputSchema: renderInputSchema,
    outputSchema: renderOutputSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, async ({ filename, html, path, root, open, viewer }) => {
    try {
      if (html !== undefined && path !== undefined) throw new Error("pass html or path, not both");
      if (path !== undefined && filename !== undefined) throw new Error("filename is not allowed with path; the page is named after its source");
      if (path === undefined && (html === undefined || filename === undefined)) throw new Error("pass html with filename, or path");
      const source = path === undefined ? undefined : readSourcePath(path, () => resolveOutputDirectory().path);
      const result = await writeRenderedHtml(source?.filename ?? filename, source?.html ?? html, open, viewer, root ?? process.cwd(), source?.source);
      return renderToolResult(result.message, result.output, result.images);
    } catch (error) {
      return renderToolError(error);
    }
  });
}

export function createServer() {
  const server = new McpServer({ name: "visual-explainer", version: packageJson.version });
  registerResources(server);
  registerPrompts(server);
  registerTools(server);
  return server;
}

function isMainModule() {
  return Boolean(process.argv[1] && realpathSync(process.argv[1]) === serverPath);
}

if (isMainModule()) {
  const handle = serveStdio(createServer);
  console.error("visual-explainer MCP server running on stdio");

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      void handle.close().finally(() => process.exit(0));
    });
  }

}
