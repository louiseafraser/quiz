const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const data = require('../public/quiz-data.js');
const context = {module: {exports: {}}, results: data.results};
vm.createContext(context);
vm.runInContext(fs.readFileSync(require.resolve('../public/script.js'), 'utf8'), context);
const {calculateResult, shuffleArray} = context.module.exports;
assert.equal(data.questions.length, 10);
for (const q of data.questions) {
  assert.equal(q.answers.length, 6);
  assert.deepEqual(q.answers.map(a => a.main).sort(), Object.keys(data.results).sort());
  assert.ok(q.answers.every(a => a.text.length > 10));
}
for (const id of Object.keys(data.results)) assert.equal(calculateResult(Array(10).fill(id)), id);
assert.equal(calculateResult(['EX','PP','EX','PP','RT','RT','SA','SA','CH','CH']), 'CH');
assert.equal(calculateResult(['EX','PP','EX','PP','RT','RT','SA','SA','CH','EX']), 'EX');
for(let i=0;i<50;i++) {
  const shuffled=shuffleArray([...data.questions[0].answers]);
  assert.equal(new Set(shuffled).size,6);
  assert.ok(shuffled.every(a=>data.questions[0].answers.includes(a)));
}
console.log('Quiz structure, all six outcomes, tie-breaks and shuffle assignments passed.');
