import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);

function readJson(relativePath) {
  try {
    return JSON.parse(readFileSync(new URL(relativePath, root), "utf8"));
  } catch (error) {
    throw new Error(`${relativePath}: ${error.message}`);
  }
}

const packageJson = readJson("package.json");
const rootPluginManifest = readJson(".claude-plugin/plugin.json");
const marketplace = readJson(".claude-plugin/marketplace.json");
const pluginManifest = readJson("plugins/visual-explainer/.claude-plugin/plugin.json");
const skill = readFileSync(new URL("plugins/visual-explainer/SKILL.md", root), "utf8");
const marketplacePlugin = Array.isArray(marketplace?.plugins)
  ? marketplace.plugins.find((plugin) => plugin?.source === "./plugins/visual-explainer")
  : undefined;
const skillVersion = skill.match(/^metadata:\n(?:  .+\n)*?  version:\s*["']?([^"'\n]+)["']?\s*$/m)?.[1];

const versions = [
  ["package.json", packageJson?.version],
  [".claude-plugin/plugin.json", rootPluginManifest?.version],
  [".claude-plugin/marketplace.json metadata.version", marketplace?.metadata?.version],
  [
    ".claude-plugin/marketplace.json plugins[visual-explainer].version",
    marketplacePlugin?.version,
  ],
  ["plugins/visual-explainer/.claude-plugin/plugin.json", pluginManifest?.version],
  ["plugins/visual-explainer/SKILL.md metadata.version", skillVersion],
];
const expected = versions[0][1];
const invalid =
  typeof expected !== "string" ||
  expected.length === 0 ||
  versions.some(([, version]) => version !== expected);

if (invalid) {
  console.error("Version guard failed. All release metadata must match package.json:");
  for (const [file, version] of versions) {
    console.error(`  ${file}: ${version ?? "<missing>"}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Version guard passed: ${expected}`);
}
