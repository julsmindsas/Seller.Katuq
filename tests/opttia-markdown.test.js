const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = fs.readFileSync('src/app/shared/components/opttia-chat/opttia-markdown.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const target = { exports: {} };
new Function('require', 'module', 'exports', compiled)(require, target, target.exports);
const { renderOpttiaMarkdown: render } = target.exports;

test('renders headings, emphasis, lists and tables', () => {
  const html = render('## Stock\n\n**176 agotados**\n\n1. Producto\n2. Otro\n\n| SKU | Stock |\n| --- | --- |\n| A | 0 |');
  for (const tag of ['<h2>', '<strong>', '<ol>', '<table>']) assert.ok(html.includes(tag));
});
test('does not activate HTML, scripts, remote images or unsafe links', () => {
  const html = render('<script>alert(1)</script>\n<img src=x onerror=alert(1)>\n![pixel](https://example.com/pixel)\n[x](javascript:alert(1))');
  assert.doesNotMatch(html, /<script|<img|href="javascript:/i);
  assert.match(html, /&lt;script&gt;/);
});
test('renders code literally and supports partial streaming markdown', () => {
  assert.match(render('`<img>`'), /<code>&lt;img&gt;<\/code>/);
  assert.doesNotThrow(() => render('**respuesta parcial'));
  assert.match(render('**respuesta completa**'), /<strong>respuesta completa<\/strong>/);
});
