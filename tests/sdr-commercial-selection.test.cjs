const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
function compile(source, dependencies) {
  const exports = {};
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText,
    { exports, URL, Date, console, FormData() { throw new Error('unexpected_form_data'); }, fetch() { throw new Error('unexpected_network'); }, require(id) {
      if (Object.hasOwn(dependencies, id)) return dependencies[id]; throw new Error(`unexpected_dependency: ${id}`);
    } });
  return exports;
}
function harness() {
  const catalog = compile(readFileSync(require.resolve('../lib/sdr/catalog.ts'), 'utf8'), {});
  const policy = compile(readFileSync(require.resolve('../lib/sdr/commercial-classification.ts'), 'utf8'), { './catalog': catalog });
  const slots = []; let cursor = 0, effects = [];
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = value; }]; },
    useEffect(effect, dependencies) { const i = cursor++; const previous = slots[i];
      if (!previous || dependencies.some((value, index) => !Object.is(value, previous[index]))) effects.push(effect);
      slots[i] = dependencies;
    },
  };
  const jsx = (type, props) => ({ type, props });
  const component = compile(readFileSync(require.resolve('../components/admin/AdminCommercial.tsx'), 'utf8') + '\nexport { Opportunity };', {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'lucide-react': {}, '@/lib/sdr/catalog': catalog,
    '@/lib/sdr/commercial-classification': policy, './AdminHeader': {}, './AdminBusinessUi': { money: () => 'R$ 0' },
  });
  const calls = [];
  const classification = { type: 'customer_or_partner', source: 'manual', classifiedAt: 'initial' };
  const props = { o: { id: 'opportunity', product: 'conviteia', stage: 'new', lead: {
    company_name: 'Empresa Teste', domain: 'empresa.com.br', source: 'web_research', evidence: 'Buffet para eventos.', email: null,
  }, qualification: { commercial_classification: classification } }, busy: false,
  action(payload) { calls.push(payload); } };
  function render() { cursor = 0; effects = []; const tree = component.Opportunity(props); effects.forEach(effect => effect()); return tree; }
  function nodes(tree, predicate) {
    if (!tree || typeof tree !== 'object') return [];
    const children = [tree.props?.children].flat(Infinity);
    return [...(predicate(tree) ? [tree] : []), ...children.flatMap(child => nodes(child, predicate))];
  }
  const select = tree => nodes(tree, node => node.type === 'select' && node.props.name === 'type')[0];
  const form = tree => nodes(tree, node => node.type === 'form' && nodes(node, n => n.type === 'select' && n.props.name === 'type').length)[0];
  return { props, calls, render, select, form, nodes };
}
test('manual selector submits every chosen type instead of previous persisted classification, without FormData/network/sends', () => {
  for (const type of ['partner', 'customer', 'customer_or_partner', 'low_priority']) {
    const h = harness(); let tree = h.render();
    h.select(tree).props.onChange({ target: { value: type } }); tree = h.render();
    assert.equal(h.select(tree).props.value, type);
    h.form(tree).props.onSubmit({ preventDefault() {}, currentTarget: {} });
    assert.equal(h.calls.length, 1); assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0])), {
      action: 'commercial_classification', id: 'opportunity', mode: 'manual', type,
    });
    assert.equal(h.props.o.lead.email, null);
  }
});
test('manual selection survives unrelated renders and synchronizes after persisted save/recalculation', () => {
  const h = harness(); let tree = h.render(); h.select(tree).props.onChange({ target: { value: 'partner' } });
  h.props.busy = true; tree = h.render(); assert.equal(h.select(tree).props.value, 'partner');
  h.props.o.qualification = { commercial_classification: { ...h.props.o.qualification.commercial_classification } };
  tree = h.render(); assert.equal(h.select(tree).props.value, 'partner');
  h.props.o.qualification.commercial_classification = { type: 'customer', source: 'manual', classifiedAt: 'saved' };
  h.render(); tree = h.render(); assert.equal(h.select(tree).props.value, 'customer');
  const recalculate = h.nodes(tree, node => node.type === 'button' && node.props.children === 'Recalcular e remover ajuste manual')[0];
  recalculate.props.onClick(); assert.equal(h.calls[0].mode, 'recalculate');
  h.props.o.qualification.commercial_classification = { type: 'partner', source: 'automatic', classifiedAt: 'recalculated' };
  h.render(); tree = h.render(); assert.equal(h.select(tree).props.value, 'partner');
});
