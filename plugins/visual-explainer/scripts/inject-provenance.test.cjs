// Smoke tests for inject-provenance.cjs
const assert = require('assert');
const {
  injectProvenance,
  buildFooter,
  MARKER,
  isEnabled,
} = require('./inject-provenance.cjs');

// 1. Footer is injected before </body>.
const html = '<html><body><h1>Hi</h1></body></html>';
const out = injectProvenance(html, { generatedAt: '2026-04-08T00:00:00Z', tool: 've' });
assert.ok(out.includes(MARKER), 'marker present');
assert.ok(out.indexOf(MARKER) < out.toLowerCase().indexOf('</body>'), 'before </body>');

// 2. Idempotent — second pass does not duplicate.
const out2 = injectProvenance(out, { generatedAt: '2026-04-08T00:00:00Z', tool: 've' });
assert.strictEqual(out.split(MARKER).length, out2.split(MARKER).length, 'no duplication');

// 3. No </body>: appends at end.
const bare = '<h1>Hi</h1>';
const out3 = injectProvenance(bare, { generatedAt: 'now', tool: 've' });
assert.ok(out3.includes(MARKER), 'marker added even without body tag');

// 4. Footer escapes HTML in source path.
const f = buildFooter({ source: '<script>x</script>', generatedAt: 'now', tool: 've' });
assert.ok(!f.includes('<script>x</script>'), 'source escaped');
assert.ok(f.includes('&lt;script&gt;'), 'angle brackets entity-encoded');

// 5. Disabled by default.
assert.strictEqual(isEnabled([]), false, 'disabled by default');
assert.strictEqual(isEnabled(['--enabled']), true, 'enabled by flag');

console.log('inject-provenance.test.cjs OK');
