// Lists what each source file declares at its top level (the names every file shares), and any top-level `return`.
// Prints JSON: { files: { "<file>": { names: [[name, kind], ...], returns: [line, ...] } } }.  Used by check_scope.py.
const fs = require('fs'), path = require('path'), acorn = require('acorn');
const root = path.resolve(__dirname, '..');
const order = fs.readFileSync(path.join(root, 'src/order.txt'), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#') && l.endsWith('.js'));
const out = { files: {} };
function names(pat, kind, into) {
  if (!pat) return;
  if (pat.type === 'Identifier') into.push([pat.name, kind]);
  else if (pat.type === 'ObjectPattern') for (const p of pat.properties) names(p.type === 'RestElement' ? p.argument : p.value, kind, into);
  else if (pat.type === 'ArrayPattern') for (const e of pat.elements) names(e, kind, into);
  else if (pat.type === 'AssignmentPattern') names(pat.left, kind, into);
  else if (pat.type === 'RestElement') names(pat.argument, kind, into);
}
for (const f of order) {
  const src = fs.readFileSync(path.join(root, 'src', f), 'utf8');
  let ast;
  try { ast = acorn.parse(src, { ecmaVersion: 2022, sourceType: 'script', allowReturnOutsideFunction: true, locations: true }); }
  catch (e) { console.error(`${f}: ${e.message}`); process.exit(2); }
  const rec = { names: [], returns: [] };
  for (const n of ast.body) {
    if (n.type === 'VariableDeclaration') for (const d of n.declarations) names(d.id, n.kind, rec.names);
    else if (n.type === 'FunctionDeclaration') rec.names.push([n.id.name, 'function']);
    else if (n.type === 'ClassDeclaration') rec.names.push([n.id.name, 'class']);
  }
  // a `return` that isn't inside any function
  (function walk(node, inFn) {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'ReturnStatement' && !inFn) rec.returns.push(node.loc.start.line);
    const fn = inFn || /Function/.test(node.type);
    for (const k in node) { const v = node[k]; if (Array.isArray(v)) v.forEach((c) => walk(c, fn)); else if (v && typeof v.type === 'string') walk(v, fn); }
  })(ast, false);
  out.files[f] = rec;
}
process.stdout.write(JSON.stringify(out));
