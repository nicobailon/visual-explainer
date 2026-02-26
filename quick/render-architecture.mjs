#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function usage() {
  console.error('Usage: node render-architecture.mjs <spec.json> <output.html>');
  process.exit(1);
}

/** HTML-escape a raw value. Always run before inserting into HTML. */
function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Format text for HTML: escape first (XSS-safe), then convert `backtick spans`
 * to <code> elements.  The inner content is already escaped so injection-safe.
 */
function fmt(value) {
  return esc(value).replace(/`([^`]+)`/g, '<code>$1</code>');
}

function pickTheme(theme) {
  const allowed = new Set(['terracotta', 'teal', 'rose', 'blueprint']);
  return allowed.has(theme) ? theme : 'terracotta';
}

function renderSourcePills(items = []) {
  return items
    .map((item) => {
      const icon = item.icon ? `<span>${esc(item.icon)}</span>` : '';
      return `<div class="source-pill">${icon}${esc(item.label)}</div>`;
    })
    .join('\n');
}

/** Cards with optional tags: string[] rendered as pill badges. */
function renderCards(cards = []) {
  return cards
    .map((card) => {
      const tags = (card.tags || []).length
        ? `<div class="card-tags">${card.tags.map((t) => `<span class="tag-pill">${esc(t)}</span>`).join('')}</div>`
        : '';
      return `
        <div class="inner-card">
          <div class="title">${fmt(card.title)}</div>
          <div class="desc">${fmt(card.desc)}</div>
          ${tags}
        </div>`;
    })
    .join('\n');
}

/** KPI strip: [{value, label, tone?, delta?}] */
function renderKpis(kpis = []) {
  if (!kpis.length) return '';
  const cards = kpis
    .map((k) => {
      const tone = esc(k.tone || 'accent');
      const delta = k.delta ? `<div class="kpi-delta">${esc(k.delta)}</div>` : '';
      return `<div class="kpi-card tone-${tone}">
        <div class="kpi-value">${esc(k.value)}</div>
        <div class="kpi-label">${esc(k.label)}</div>
        ${delta}
      </div>`;
    })
    .join('\n');
  return `<div class="kpi-strip animate" style="--i:1">${cards}</div>`;
}

/** Legend: [{label, tone}] rendered as compact badge row. */
function renderLegend(legend = []) {
  if (!legend.length) return '';
  const badges = legend
    .map((l) => `<span class="legend-badge legend-badge--${esc(l.tone || 'accent')}">${esc(l.label)}</span>`)
    .join('\n');
  return `<div class="legend-row animate" style="--i:2">${badges}</div>`;
}

function renderPipeline(steps = []) {
  return steps
    .map((step, idx) => {
      const stepHtml = `
        <div class="pipeline-step" data-kind="${esc(step.kind || 'no-llm')}">
          <div class="step-name">${esc(step.name)}</div>
          <div class="step-detail">${fmt(step.detail || '')}</div>
        </div>`;
      if (idx === steps.length - 1) return stepHtml;
      return `${stepHtml}\n<div class="pipeline-arrow">→</div>`;
    })
    .join('\n');
}

/** Output sections with optional blurb string displayed under section label. */
function renderOutputSections(outputs = []) {
  return outputs
    .map((output, index) => {
      const accentByIndex = ['green', 'plum', 'teal', 'orange', 'accent'];
      const accent = output.accent || accentByIndex[index % accentByIndex.length];
      const blurb = output.blurb
        ? `<p class="section-blurb">${fmt(output.blurb)}</p>`
        : '';
      const list = (output.items || [])
        .map((item) => `<li>${fmt(item)}</li>`)
        .join('\n');
      return `
        <div class="section section--${esc(accent)} animate" style="--i:${9 + index}">
          <div class="section-label"><span class="dot"></span>${esc(output.label)}</div>
          ${blurb}
          <ul class="node-list">
            ${list}
          </ul>
        </div>`;
    })
    .join('\n');
}

function renderHtml(spec, cssText) {
  const theme = pickTheme(spec.theme);
  const title = spec.title || 'Architecture Overview';
  const subtitle = spec.subtitle || '';
  const generatedAt = spec.generatedAt || new Date().toISOString();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&family=Bricolage+Grotesque:wght@400;500;600;700&family=Fragment+Mono:wght@400&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Sora:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
${cssText}
  </style>
</head>
<body data-theme="${esc(theme)}">
  <div class="container">
    <h1 class="animate" style="--i:0">${esc(title)}</h1>
    <p class="subtitle animate" style="--i:1">${esc(subtitle)}</p>
    ${renderKpis(spec.kpis || [])}
    ${renderLegend(spec.legend || [])}

    <div class="diagram">
      <div class="section section--hero animate" style="--i:2">
        <div class="section-label"><span class="dot"></span>${esc(spec.inputLabel || 'Input Sources')}</div>
        <div class="sources">
          ${renderSourcePills(spec.inputSources || [])}
        </div>
      </div>

      <div class="flow-arrow animate" style="--i:3">
        <svg viewBox="0 0 20 20"><path d="M10 4 L10 16 M6 12 L10 16 L14 12"/></svg>
        ${esc(spec.gatewayFlowLabel || 'incoming events')}
      </div>

      <div class="section section--accent animate" style="--i:4">
        <div class="section-label"><span class="dot"></span>${esc(spec.gateway?.label || 'Gateway Layer')}</div>
        <div class="inner-grid">
          ${renderCards(spec.gateway?.cards || [])}
        </div>
      </div>

      <div class="flow-arrow animate" style="--i:5">
        <svg viewBox="0 0 20 20"><path d="M10 4 L10 16 M6 12 L10 16 L14 12"/></svg>
        ${esc(spec.pipelineFlowLabel || 'pipeline entry')}
      </div>

      <div class="section section--green animate" style="--i:6">
        <div class="section-label"><span class="dot"></span>${esc(spec.pipeline?.label || 'Processing Pipeline')}</div>
        <div class="pipeline">
          ${renderPipeline(spec.pipeline?.steps || [])}
        </div>
      </div>

      <div class="flow-arrow animate" style="--i:7">
        <svg viewBox="0 0 20 20"><path d="M10 4 L10 16 M6 12 L10 16 L14 12"/></svg>
        ${esc(spec.databaseFlowLabel || 'stored and queryable')}
      </div>

      <div class="section section--orange animate" style="--i:8">
        <div class="section-label"><span class="dot"></span>${esc(spec.database?.label || 'Storage Layer')}</div>
        <div class="inner-grid">
          ${renderCards(spec.database?.cards || [])}
        </div>
      </div>

      <div class="three-col">
        ${renderOutputSections(spec.outputs || [])}
      </div>

      <div class="callout section animate" style="--i:14">
        <strong>${esc(spec.calloutTitle || 'Note')}</strong> — ${fmt(spec.callout || 'No callout provided.')}
      </div>
    </div>

    <p class="meta">Generated via static-assembler prototype · ${esc(generatedAt)}</p>
  </div>
</body>
</html>`;
}

async function main() {
  const [specPath, outPath] = process.argv.slice(2);
  if (!specPath || !outPath) usage();

  const cssPath = path.join(__dirname, 'base.css');
  const [specText, cssText] = await Promise.all([
    fs.readFile(specPath, 'utf8'),
    fs.readFile(cssPath, 'utf8'),
  ]);

  const spec = JSON.parse(specText);
  const html = renderHtml(spec, cssText);

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, html, 'utf8');
  console.log(`✓ Rendered → ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
