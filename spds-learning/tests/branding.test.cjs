const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {results} = require('../public/quiz-data.js');
const css = fs.readFileSync(require.resolve('../public/brand.css'), 'utf8');
const expected = {EX:'#008B95', PP:'#D58A00', CC:'#D50065', RT:'#0875B9', SA:'#71328A', CH:'#558914'};
const source = fs.readFileSync(require.resolve('../public/script.js'), 'utf8');
for (const [id, colour] of Object.entries(expected)) {
  assert.ok(css.includes(`--colour-${id.toLowerCase()}: ${colour}`));
  assert.equal(results[id].color, `var(--colour-${id.toLowerCase()})`);
  for (const reduced of [false, true]) {
    const nodes = {};
    const particles = [];
    const submissions = [];
    const timers = [];
    const node = () => ({style:{setProperty(k,v){this[k]=v}}, classList:{add(){},remove(){}},focus(){},remove(){}});
    const context = {results, Math, setTimeout(fn,ms){timers.push({fn,ms})}, window:{scrollTo(){},matchMedia:()=>({matches:reduced})},
      document:{getElementById:k=>nodes[k] ||= node(), querySelectorAll:()=>[], createElement:node,body:{appendChild:n=>particles.push(n)}},
      queueCompletion:(...args)=>submissions.push(args)};
    vm.createContext(context);
    vm.runInContext(source, context);
    vm.runInContext(`selectedAnswers = Array(10).fill('${id}'); completionId = 'test-${id}'; showResult()`, context);
    const reveal = timers.find(t=>t.ms===2000).fn;
    reveal();
    assert.equal(nodes.resultTitle.textContent, results[id].title);
    assert.equal(nodes.resultSummary.textContent, results[id].summary);
    assert.equal(nodes.resultScreen.style['--result-colour'], results[id].color);
    assert.equal(submissions.length, 1);
    assert.equal(submissions[0][1], id);
    assert.equal(particles.length, reduced ? 0 : 40);
    if (!reduced) {
      assert.ok(particles.every(p=>p.style.backgroundColor.includes(results[id].color) || p.style.backgroundColor === '#F2FBFC'));
      assert.equal(new Set(particles.map(p=>p.style.backgroundColor)).size, 4);
    }
    reveal(); // A repeated reveal must not repeat celebration or submission.
    assert.equal(particles.length, reduced ? 0 : 40);
    assert.equal(submissions.length, 1);
  }
}
console.log('All six result accents/wording, themed confetti, one-time reveal and reduced motion passed.');
