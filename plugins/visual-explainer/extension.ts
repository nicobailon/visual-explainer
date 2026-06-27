import { existsSync, lstatSync, mkdirSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import type { AgentToolResult, ExtensionAPI } from "@earendil-works/pi-coding-agent";

type VisualExplainerParams = {
  action: "prepare" | "render";
  topic?: string;
  goal?: string;
  files?: string[];
  audience?: string;
  preferSubagent?: boolean;
  filename?: string;
  html?: string;
  open?: boolean;
};

type OpenStatus = "disabled" | "unsupported" | "dispatched" | "failed";

type OpenResult = {
  openAttempted: boolean;
  openStatus: OpenStatus;
  openError?: string;
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
};

type VisualExplainerDetails = PrepareDetails | RenderDetails;

const visualExplainerParameters = {
  type: "object",
  properties: {
    action: {
      type: "string",
      enum: ["prepare", "render"],
      description: "Choose prepare to plan a visual explanation, or render to write complete HTML to ~/.agent/diagrams/.",
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
      description: "For action=render: basename or slug for the output file. The tool appends .html if missing.",
    },
    html: {
      type: "string",
      description: "For action=render: complete self-contained HTML document to write.",
    },
    open: {
      type: "boolean",
      description: "For action=render: open the written HTML file in the browser. Defaults to true.",
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

function outputFilename(input: string) {
  const raw = input.trim().replace(/^@/, "");

  if (!raw) throw new Error("filename is required");
  if (raw.includes("/") || raw.includes("\\")) throw new Error("filename must be a basename, not a path");
  if (raw.includes("..")) throw new Error("filename must not contain '..'");
  if (/[\0-\x1f\x7f]/.test(raw)) throw new Error("filename must not contain control characters");

  return /\.html?$/i.test(raw) ? raw : `${raw}.html`;
}

const STANDARD_FAVICON =
  '<link rel="icon" href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+PHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNyIgZmlsbD0iIzBmMTcyOSIvPjxjaXJjbGUgY3g9IjkiIGN5PSIxMC41IiByPSIzIiBmaWxsPSIjZDRhNzNhIi8+PGNpcmNsZSBjeD0iMjMiIGN5PSIxMC41IiByPSIzIiBmaWxsPSIjNjBhNWZhIi8+PGNpcmNsZSBjeD0iMTYiIGN5PSIyMi41IiByPSIzIiBmaWxsPSIjNGFkZTgwIi8+PHBhdGggZD0iTTkgMTAuNSBMMTYgMjIuNSBMMjMgMTAuNSIgc3Ryb2tlPSIjZDRhNzNhIiBzdHJva2Utd2lkdGg9IjEuNyIgZmlsbD0ibm9uZSIgb3BhY2l0eT0iMC43NSIvPjwvc3ZnPg==">';

// Guarantees the house-style favicon is present, regardless of what the agent emitted.
function ensureFavicon(html: string): string {
  if (/<link\b[^>]*rel\s*=\s*["']?(?:shortcut\s+)?icon/i.test(html)) return html;
  if (/<\/title>/i.test(html)) return html.replace(/<\/title>/i, `</title>\n${STANDARD_FAVICON}`);
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => `${m}\n${STANDARD_FAVICON}`);
  return html;
}

function assertHtmlDocument(html: string) {
  const trimmed = html.trim();
  if (!trimmed) throw new Error("html is required");

  const start = trimmed.replace(/^\s*<!doctype\s+html\b[^>]*>\s*/i, "").replace(/^(?:<!--[\s\S]*?-->\s*)+/, "");
  if (!/^<html[\s>]/i.test(start) || !/<\/html>\s*$/i.test(trimmed)) {
    throw new Error("html must be a complete HTML document starting with <!doctype html> or <html> and ending with </html>");
  }
}

async function openInBrowser(path: string): Promise<OpenResult> {
  let command: string;
  let args: string[];

  if (process.platform === "darwin") {
    command = "open";
    args = [path];
  } else if (process.platform === "linux") {
    command = "xdg-open";
    args = [path];
  } else if (process.platform === "win32") {
    command = "cmd";
    args = ["/c", "start", "", path];
  } else {
    return { openAttempted: false, openStatus: "unsupported" };
  }

  return await new Promise<OpenResult>((resolve) => {
    const child = spawn(command, args, { detached: true, stdio: "ignore", windowsHide: true });
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
        openError: error.message,
      });
    });

    child.once("exit", (code, signal) => {
      if (code !== 0) {
        settle({
          openAttempted: true,
          openStatus: "failed",
          openError: code === null ? `opener exited with signal ${signal ?? "unknown"}` : `opener exited with code ${code}`,
        });
      }
    });

    const timer = setTimeout(() => {
      settle({ openAttempted: true, openStatus: "dispatched" });
    }, 250);

    child.unref();
  });
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
  const recommendedFlow = shouldUseSubagent
    ? [
        "Run a scout subagent to gather repo context and identify the visual structure.",
        "Synthesize the findings into a concise visual outline for the target audience.",
        "Read the relevant visual-explainer references or templates before generating the page.",
        "Generate a complete self-contained HTML document using the visual-explainer skill.",
        "Choose a basename filename and call visual_explainer with action=render, filename, html, and optional open.",
      ]
    : [
        "Gather the needed context directly in the main agent.",
        "Create a concise visual outline for the target audience.",
        "Read the relevant visual-explainer references or templates before generating the page.",
        "Generate a complete self-contained HTML document using the visual-explainer skill.",
        "Choose a basename filename and call visual_explainer with action=render, filename, html, and optional open.",
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

async function renderVisualExplanation(params: VisualExplainerParams, signal?: AbortSignal): Promise<AgentToolResult<VisualExplainerDetails>> {
  if (typeof params.filename !== "string") throw new Error("filename must be a string for action=render");
  if (typeof params.html !== "string") throw new Error("html must be a string for action=render");
  if (params.open !== undefined && typeof params.open !== "boolean") throw new Error("open must be a boolean when provided");

  signal?.throwIfAborted();

  const filename = outputFilename(params.filename);
  assertHtmlDocument(params.html);

  const outputDir = join(homedir(), ".agent", "diagrams");
  const outputPath = join(outputDir, filename);
  mkdirSync(outputDir, { recursive: true });
  if (lstatSync(outputDir).isSymbolicLink()) throw new Error(`${outputDir} must not be a symlink`);
  if (existsSync(outputPath) && lstatSync(outputPath).isSymbolicLink()) {
    throw new Error(`${outputPath} must not be a symlink`);
  }

  signal?.throwIfAborted();
  const finalHtml = ensureFavicon(params.html);
  writeFileSync(outputPath, finalHtml, "utf8");

  signal?.throwIfAborted();

  const openResult = params.open === false
    ? { openAttempted: false, openStatus: "disabled" as const }
    : await openInBrowser(outputPath);

  let message = `Wrote ${outputPath}.`;
  if (openResult.openStatus === "dispatched") {
    message += " Browser open requested.";
  } else if (openResult.openStatus === "failed") {
    message += ` Browser open failed: ${openResult.openError ?? "unknown error"}.`;
  } else if (openResult.openStatus === "unsupported") {
    message += " Browser opening is unsupported on this platform.";
  }

  return {
    content: [{ type: "text" as const, text: message }],
    details: { action: "render", path: outputPath, ...openResult },
  };
}

export default function (pi: ExtensionAPI) {
  pi.registerTool<typeof visualExplainerParameters, VisualExplainerDetails>({
    name: "visual_explainer",
    label: "Visual Explainer",
    description: "Use with action=prepare after generating or reviewing a plan, architecture, diff, or substantial implementation when a visual explanation would help; use action=render after the complete HTML is ready to write it to ~/.agent/diagrams/ and optionally open it.",
    promptSnippet: "Plan or render visual-explainer HTML. Ask before action=prepare unless visuals were explicitly requested; use action=render as the final write/open step with complete HTML.",
    promptGuidelines: [
      "After generating or reviewing a plan, architecture, diff, or substantial implementation, consider offering a visual explanation if it would clarify the work for the user.",
      "Because visual explanations can consume many tokens, ask before calling visual_explainer with action=prepare unless the user explicitly requested a diagram, visual review, recap, or visual plan.",
      "If visual_explainer action=prepare recommends subagent scouting and the subagent tool is available, gather context first, then synthesize complete HTML and finish with visual_explainer action=render.",
      "Use visual_explainer action=render only after generating a complete visual-explainer HTML document; pass a basename-style filename because it writes under ~/.agent/diagrams/.",
    ],
    parameters: visualExplainerParameters,
    executionMode: "sequential",
    async execute(_toolCallId: string, params: VisualExplainerParams, signal?: AbortSignal) {
      if (params.action !== "prepare" && params.action !== "render") {
        throw new Error("action must be either 'prepare' or 'render'");
      }

      if (params.action === "prepare") return prepareVisualExplanation(pi, params);
      return await renderVisualExplanation(params, signal);
    },
  });
}
