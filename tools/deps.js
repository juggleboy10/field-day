// For every source file: which top-level names from OTHER files it uses. Prints JSON { "<file>": { "<other file>": [names] } }.
const fs = require('fs'), path = require('path'), acorn = require('acorn'), globals = require('acorn-globals');
const root = path.resolve(__dirname, '..');
const order = fs.readFileSync(path.join(root, 'src/order.txt'), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#') && l.endsWith('.js'));
const scope = JSON.parse(require('child_process').execFileSync('node', [path.join(__dirname, 'scope.js')], { maxBuffer: 1 << 26 })).files;
const home = {};
for (const f of order) for (const [n] of scope[f].names) home[n] = f;
const out = {};
for (const f of order) {
  const src = fs.readFileSync(path.join(root, 'src', f), 'utf8');
  const ast = acorn.parse(src, { ecmaVersion: 2022, sourceType: 'script', allowReturnOutsideFunction: true });
  const uses = {};
  for (const g of globals(ast)) { const h = home[g.name]; if (h && h !== f) (uses[h] = uses[h] || []).push(g.name); }
  out[f] = uses;
}
process.stdout.write(JSON.stringify(out));
