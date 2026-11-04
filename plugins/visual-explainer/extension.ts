import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { createInterface } from "node:readline";
import type { AgentToolResult, ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { prepareRenderedHtml, readSourcePath, renderPageForHost, reportLine, reportPage } from "./kit/render.mjs";
import { lookAt, lookLines } from "./kit/look.mjs";

type VisualExplainerParams = {
  action: "prepare" | "render";
  topic?: string;
  goal?: string;
  files?: string[];
  audience?: string;
  preferSubagent?: boolean;
  filename?: string;
  html?: string;
  path?: string;
  open?: boolean;
  viewer?: Viewer;
};

type Viewer = "browser" | "glimpse" | "auto";
type OpenTarget = "browser" | "glimpse";
type OpenStatus = "disabled" | "unsupported" | "dispatched" | "failed";

type PlanHost = { root: string; onResponse: (markdown: string, page: string) => void; closed: AbortSignal };

type OpenResult = {
  openAttempted: boolean;
  openStatus: OpenStatus;
  openTarget?: OpenTarget;
  openError?: string;
  fallbackFrom?: OpenTarget;
  fallbackError?: string;
};

type SubagentDetection = {
  available: boolean;
  allToolsHasSubagent?: boolean;
  error?: string;
};

type PrepareDetails = {
  action: "prepare";
  topic: string;
  goal?: string;
  audience?: string;
  files: string[];
  subagentAvailable: boolean;
  subagentAllToolsAvailable?: boolean;
  subagentDetectionError?: string;
  recommendedFlow: string[];
  subagentPrompt?: string;
};

type RenderDetails = OpenResult & {
  action: "render";
  path: string;
  viewer: Viewer;
  source?: string;
  report?: PageReport;
  problems?: string[];
  sheets?: string[];
};

type PageReport = { figures: number; uncaptioned: number; dataTags: number; flows: number; proseWords: number; machines?: string[] };

type VisualExplainerDetails = PrepareDetails | RenderDetails;

const visualExplainerParameters = {
  type: "object",
  properties: {
    action: {
      type: "string",
      enum: ["prepare", "render"],
      description: "Choose prepare to plan, or render to render a page source to HTML.",
    },
    topic: {
      type: "string",
      description: "For action=prepare: what the visual explanation should cover.",
    },
    goal: {
      type: "string",
      description: "For action=prepare: what the user wants to understand, decide, or communicate.",
    },
    files: {
      type: "array",
      items: { type: "string" },
      description: "For action=prepare: relevant files or paths the agent may inspect before generating the visual explanation.",
    },
    audience: {
      type: "string",
      description: "For action=prepare: intended audience, such as developer, PM, team, reviewer, or executive.",
    },
    preferSubagent: {
      type: "boolean",
      description: "For action=prepare: when true, recommend a scout subagent first if the subagent tool is active. Defaults to true.",
    },
    filename: {
      type: "string",
      description: "For action=render with html: basename for the output file; .html is appended if missing.",
    },
    html: {
      type: "string",
      description: "For action=render, instead of path: a page source or a complete HTML document.",
    },
    path: {
      type: "string",
      description: "For action=render, instead of html: a <name>.src.html file in the output directory.",
    },
    open: {
      type: "boolean",
      description: "For action=render: open the written file. Defaults to true.",
    },
    viewer: {
      type: "string",
      enum: ["browser", "glimpse", "auto"],
      description: "For action=render: browser (default), glimpse, or auto (glimpseui, else the browser)."
    },
  },
  required: ["action"],
  additionalProperties: false,
} as const;

function detectSubagent(pi: ExtensionAPI): SubagentDetection {
  let error: string | undefined;

  try {
    return { available: pi.getActiveTools().includes("subagent") };
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
  }

  try {
    return {
      available: false,
      allToolsHasSubagent: pi.getAllTools().some((tool) => tool.name === "subagent"),
      error,
    };
  } catch (caught) {
    const fallbackError = caught instanceof Error ? caught.message : String(caught);
    return { available: false, error: error ? `${error}; ${fallbackError}` : fallbackError };
  }
}

function resolveOutputDirectory() {
  const configured = process.env.VISUAL_EXPLAINER_OUTPUT_DIR?.trim();
  return {
    path: configured ? resolve(configured) : join(homedir(), ".agent", "diagrams"),
    configured: Boolean(configured),
  };
}

// Checks the nearest existing ancestor, so a rejected directory is never created through a symlink.
function assertResolvesToItself(path: string) {
  let existing = path;
  // A missing Windows drive or UNC root is its own dirname; stop there and let realpathSync throw.
  while (!lstatSync(existing, { throwIfNoEntry: false }) && dirname(existing) !== existing) existing = dirname(existing);
  const resolved = join(realpathSync(existing), relative(existing, path));
  if (resolved !== path) throw new Error(`${path} must not contain symlinks and must resolve to itself (it resolves to ${resolved})`);
}

function outputFilename(input: string) {
  const raw = input.trim().replace(/^@/, "");

  if (!raw) throw new Error("filename is required");
  if (raw.includes("/") || raw.includes("\\")) throw new Error("filename must be a basename, not a path");
  if (raw.includes("..")) throw new Error("filename must not contain '..'");
  if (/[\0-\x1f\x7f]/.test(raw)) throw new Error("filename must not contain control characters");

  return /\.html?$/i.test(raw) ? raw : `${raw}.html`;
}

function assertHtmlDocument(html: string) {
  const trimmed = html.trim();
  if (!trimmed) throw new Error("html is required");

  const start = trimmed.replace(/^\s*<!doctype\s+html\b[^>]*>\s*/i, "").replace(/^(?:<!--[\s\S]*?-->\s*)+/, "");
  if (!/^<html[\s>]/i.test(start) || !/<\/html>\s*$/i.test(trimmed)) {
    throw new Error("html must be a complete HTML document starting with <!doctype html> or <html> and ending with </html>");
  }
}

type WindowListener = { onMessage: (data: unknown) => void; closed: AbortSignal };

function runOpener(command: string, args: string[], openTarget: OpenTarget, listener?: WindowListener): Promise<OpenResult> {
  return new Promise<OpenResult>((resolve) => {
    const child = spawn(command, args, { detached: true, stdio: listener ? ["ignore", "pipe", "ignore"] : "ignore", windowsHide: true });
    if (listener && child.stdout) {
      // glimpseui prints each window.glimpse.send(...) payload as one JSON line
      const lines = createInterface({ input: child.stdout });
      lines.on("line", (line) => {
        let data: unknown;
        try { data = JSON.parse(line); } catch { return; }
        listener.onMessage(data);
      });
      // Killing glimpseui ends the native window's stdin, which closes the window.
      const closeWindow = () => { lines.close(); child.kill(); };
      listener.closed.addEventListener("abort", closeWindow, { once: true });
      child.once("close", () => listener.closed.removeEventListener("abort", closeWindow));
      (child.stdout as unknown as { unref(): void }).unref();
    }
    let settled = false;

    const settle = (result: OpenResult) => {
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

async function openInBrowser(path: string): Promise<OpenResult> {
  if (process.platform === "darwin") return await runOpener("open", [path], "browser");
  if (process.platform === "linux") return await runOpener("xdg-open", [path], "browser");
  if (process.platform === "win32") return await runOpener("cmd", ["/c", "start", "", path], "browser");
  return { openAttempted: false, openStatus: "unsupported", openTarget: "browser" };
}

async function openInGlimpse(path: string, listener?: WindowListener): Promise<OpenResult> {
  return await runOpener("glimpseui", ["--width", "1200", "--height", "900", "--title", "Visual Explainer", "--open-links", path], "glimpse", listener);
}

async function openRenderedPage(path: string, viewer: Viewer, listener?: WindowListener): Promise<OpenResult> {
  if (viewer === "browser") return await openInBrowser(path);
  if (viewer === "glimpse") return await openInGlimpse(path, listener);

  const glimpseResult = await openInGlimpse(path, listener);
  if (glimpseResult.openStatus !== "failed") return glimpseResult;

  const browserResult = await openInBrowser(path);
  return {
    ...browserResult,
    fallbackFrom: "glimpse",
    fallbackError: glimpseResult.openError ?? "glimpseui failed",
  };
}

function prepareVisualExplanation(pi: ExtensionAPI, params: VisualExplainerParams): AgentToolResult<VisualExplainerDetails> {
  if (typeof params.topic !== "string") throw new Error("topic must be a string for action=prepare");
  if (params.goal !== undefined && typeof params.goal !== "string") throw new Error("goal must be a string when provided");
  if (params.audience !== undefined && typeof params.audience !== "string") throw new Error("audience must be a string when provided");
  if (params.files !== undefined && (!Array.isArray(params.files) || !params.files.every((file) => typeof file === "string"))) {
    throw new Error("files must be an array of strings when provided");
  }
  if (params.preferSubagent !== undefined && typeof params.preferSubagent !== "boolean") {
    throw new Error("preferSubagent must be a boolean when provided");
  }

  const topic = params.topic.trim();
  if (!topic) throw new Error("topic is required");

  const goal = params.goal?.trim();
  const audience = params.audience?.trim();
  const files = params.files?.map((file) => file.trim()).filter(Boolean) ?? [];
  const subagent = detectSubagent(pi);
  const shouldUseSubagent = params.preferSubagent !== false && subagent.available;
  const subagentPrompt = shouldUseSubagent
    ? `Scout the codebase for a visual explanation about ${topic}.${goal ? ` The user goal is: ${goal}.` : ""}${files.length ? ` Start with these files/paths: ${files.join(", ")}.` : ""} Return concise findings, important entities/flows, and visual structure recommendations. Do not edit files.`
    : undefined;
  const recommendedFlow = [
    ...(shouldUseSubagent
      ? ["Run a scout subagent to gather repo context and identify the visual structure.", "Synthesize the findings into a concise visual outline for the target audience."]
      : ["Gather the needed context directly in the main agent.", "Create a concise visual outline for the target audience."]),
    "Read the relevant visual-explainer references or templates before generating the page.",
    "Write <name>.src.html in the output directory using the visual-explainer skill.",
    "Call visual_explainer with action=render, path, optional open, and optional viewer.",
  ];

  const summaryLines = [
    `Prepared visual explanation for: ${topic}`,
    goal ? `Goal: ${goal}` : undefined,
    audience ? `Audience: ${audience}` : undefined,
    shouldUseSubagent ? "Recommended start: use a scout subagent for context." : "Recommended start: gather context directly in this session.",
    "Recommended flow:",
    ...recommendedFlow.map((step, i) => `${i + 1}. ${step}`),
    subagentPrompt ? `Suggested subagent task:\n${subagentPrompt}` : undefined,
  ];

  return {
    content: [{ type: "text" as const, text: summaryLines.filter((line): line is string => Boolean(line)).join("\n") }],
    details: {
      action: "prepare",
      topic,
      goal,
      audience,
      files,
      subagentAvailable: subagent.available,
      subagentAllToolsAvailable: subagent.allToolsHasSubagent,
      subagentDetectionError: subagent.error,
      recommendedFlow,
      subagentPrompt,
    },
  };
}

async function writeRenderedHtml(
  filenameInput: string,
  htmlInput: string,
  open: boolean | undefined,
  viewer: Viewer,
  signal?: AbortSignal,
  plan?: PlanHost,
  sourcePath?: string,
): Promise<AgentToolResult<VisualExplainerDetails>> {
  signal?.throwIfAborted();

  assertHtmlDocument(htmlInput);
  // Only a page Pi opens in Glimpse itself can send the reader's response back into this chat.
  const sendBack = open !== false && viewer !== "browser";
  const page = plan ? renderPageForHost(htmlInput, { root: plan.root, filename: outputFilename(filenameInput), sendBack }) : null;
  // a plan page has its own summary in its note; every other page gets the report
  const report: PageReport | undefined = page ? page.report : reportPage(htmlInput);
  const filename = page?.filename ?? outputFilename(filenameInput);
  const html = prepareRenderedHtml(page ? page.html : htmlInput);
  const { path: outputDir, configured } = resolveOutputDirectory();
  const outputPath = join(outputDir, filename);
  if (existsSync(outputDir) && lstatSync(outputDir).isSymbolicLink()) throw new Error(`${outputDir} must not be a symlink`);
  if (configured) assertResolvesToItself(outputDir);
  mkdirSync(outputDir, { recursive: true });
  if (configured) assertResolvesToItself(outputDir);
  const writeAtomically = (path: string, content: string) => {
    const existing = lstatSync(path, { throwIfNoEntry: false });
    if (existing?.isSymbolicLink()) throw new Error(`${path} must not be a symlink`);
    const temporaryPath = `${path}.${process.pid}.${randomUUID()}.tmp`;
    try {
      writeFileSync(temporaryPath, content, { encoding: "utf8", flag: "wx" });
      if (existing) chmodSync(temporaryPath, existing.mode & 0o7777);
      renameSync(temporaryPath, path);
    } finally {
      rmSync(temporaryPath, { force: true });
    }
  };

  signal?.throwIfAborted();
  // Keep the source beside the page: revisions and build receipts are small edits to it, then a new render.
  // The source goes first, so a failed write never leaves a new page beside an old source. A source read from path stays as it is.
  const source = sourcePath ?? (page?.source ? join(outputDir, page.source) : undefined);
  if (source && !sourcePath) writeAtomically(source, htmlInput);
  writeAtomically(outputPath, html);

  signal?.throwIfAborted();
  // a kit page is looked at in a browser, and its sheet comes back with the report, so the agent never scripts its own screenshots
  const looked = page?.kit ? await lookAt(outputPath) : undefined;
  signal?.throwIfAborted();

  // a plan page or a kit page can send the reader's reply back; an ordinary page has no script to send it
  const listener = page && plan ? {
    onMessage: (data: unknown) => {
      const d = data as { type?: unknown; markdown?: unknown } | null;
      if (d?.type === "visual-explainer:response" && typeof d.markdown === "string") plan.onResponse(d.markdown, outputPath);
    },
    closed: plan.closed,
  } : undefined;
  const openResult = open === false
    ? { openAttempted: false, openStatus: "disabled" as const }
    : await openRenderedPage(outputPath, viewer, listener);

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
  if (listener && openResult.openTarget === "glimpse" && openResult.openStatus === "dispatched") {
    message += page?.kit ? "\nThe reader may reply; it arrives here as a message." : " When the reader presses Send to agent, their response arrives here as a message; wait for it.";
  }

  return {
    content: [
      { type: "text" as const, text: message },
      ...(looked?.sheets ?? []).map((sheet: string) => ({ type: "image" as const, data: readFileSync(sheet).toString("base64"), mimeType: "image/png" })),
    ],
    details: { action: "render", path: outputPath, viewer, ...openResult, ...(source ? { source } : {}), ...(report ? { report } : {}), ...(looked && !looked.skipped ? { problems: looked.problems, sheets: looked.sheets } : {}) },
  };
}

function validateOpenOptions(params: VisualExplainerParams) {
  if (params.open !== undefined && typeof params.open !== "boolean") throw new Error("open must be a boolean when provided");
  if (params.viewer !== undefined && params.viewer !== "browser" && params.viewer !== "glimpse" && params.viewer !== "auto") {
    throw new Error("viewer must be browser, glimpse, or auto when provided");
  }
}

function validateRenderOptions(params: VisualExplainerParams): asserts params is VisualExplainerParams & { filename: string } {
  if (typeof params.filename !== "string") throw new Error(`filename must be a string for action=${params.action}`);
  validateOpenOptions(params);
}

async function renderVisualExplanation(params: VisualExplainerParams, plan: PlanHost, signal?: AbortSignal): Promise<AgentToolResult<VisualExplainerDetails>> {
  if (params.path !== undefined) {
    if (typeof params.path !== "string") throw new Error("path must be a string");
    if (params.html !== undefined) throw new Error("pass html or path, not both");
    if (params.filename !== undefined) throw new Error("filename is not allowed with path; the page is named after its source");
    validateOpenOptions(params);
    const source = readSourcePath(params.path, () => resolveOutputDirectory().path);
    return await writeRenderedHtml(source.filename, source.html, params.open, params.viewer ?? "browser", signal, plan, source.source);
  }
  validateRenderOptions(params);
  if (typeof params.html !== "string") throw new Error("html or path is required for action=render");
  return await writeRenderedHtml(params.filename, params.html, params.open, params.viewer ?? "browser", signal, plan);
}

export default function (pi: ExtensionAPI) {
  // A Glimpse window can outlive this session, and pi throws on any call through a stale `pi`,
  // so the session's end closes its windows before a late Send to agent can reach `pi`.
  const session = new AbortController();
  pi.on("session_shutdown", () => session.abort());

  pi.registerTool<typeof visualExplainerParameters, VisualExplainerDetails>({
    name: "visual_explainer",
    label: "Visual Explainer",
    description: "Plan visual explanations, or render a page source to HTML in ~/.agent/diagrams/ (or VISUAL_EXPLAINER_OUTPUT_DIR when set).",
    promptSnippet: "Plan or render visual-explainer pages. Use render with path for a page source.",
    promptGuidelines: [
      "After a plan, architecture, diff review, or substantial implementation, offer a visual explanation when it would clarify the work.",
      "Visuals cost many tokens: ask before visual_explainer action=prepare unless the user asked for a diagram, visual review, recap, or visual plan. If prepare recommends a scout subagent and one is available, gather context first.",
      "Write the page as <name>.src.html in ~/.agent/diagrams/ (or VISUAL_EXPLAINER_OUTPUT_DIR) and pass path to action=render; revise with small edits and render again. viewer=glimpse only when the user wants a Glimpse window.",
      "A plan source (<ve-plan> tags, references/plans.md) renders the same way, checked against the session's cwd.",
    ],
    parameters: visualExplainerParameters,
    executionMode: "sequential",
    async execute(_toolCallId: string, params: VisualExplainerParams, signal: AbortSignal | undefined, _onUpdate: unknown, ctx: { cwd: string }) {
      if (params.action !== "prepare" && params.action !== "render") {
        throw new Error("action must be 'prepare' or 'render'");
      }

      if (params.action === "prepare") return prepareVisualExplanation(pi, params);
      // a labeled message from the page rather than text the user typed; it starts a turn, or waits if the agent is busy
      const onResponse = (markdown: string, page: string) => pi.sendMessage(
        { customType: "visual_explainer_response", content: `The reader replied on ${page}:\n\n${markdown}`, display: true, details: { page } },
        { triggerTurn: true, deliverAs: "followUp" },
      );
      return await renderVisualExplanation(params, { root: ctx.cwd, onResponse, closed: session.signal }, signal);
    },
  });
}
