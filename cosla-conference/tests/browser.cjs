const assert = require('node:assert/strict');
const {chromium} = require('playwright');

const origin = process.env.COSLA_TEST_ORIGIN || 'http://127.0.0.1:8090';
const preview = origin + '/coslaconf-preview/';
const testApi = origin + '/coslaconf-test-api/';
const totals = async (prefix = testApi) => (await fetch(prefix + 'display-results')).json();
const uuid = 'a363b538-7285-4b6f-b39d-8aaee24ac8f0';
const post = (answers, id = uuid) => fetch(testApi + 'complete', {
  method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id, answers})
});
async function assertFits(page, selector, axis) {
  const fits = await page.locator(selector).evaluateAll((items, direction) => items.every(el =>
    direction === 'horizontal' ? el.scrollWidth <= el.clientWidth + 1 : el.scrollHeight <= el.clientHeight + 1
  ), axis);
  assert(fits, selector + ' overflows ' + axis);
}
async function pick(page, index) {
  await page.locator('fieldset label').nth(index).click();
}
async function fill(page, picks) {
  await page.getByRole('button', {name: 'Start Survey', exact: true}).click();
  for (let i = 0; i < 4; i++) {
    await pick(page, picks[i]);
    await page.getByRole('button', {name: i === 3 ? 'Submit Answers' : 'Next'}).click();
  }
}
async function main() {
  assert.equal((await totals()).total, 0, 'Run against fresh local test databases');
  assert.equal((await post(['A', '', 'B', 'C'])).status, 400);
  assert.equal((await post(['A', 'BC', 'B', 'C'])).status, 400);
  assert.equal((await post(['A', 'A', 'B'])).status, 400);
  assert.equal((await fetch(testApi + 'reset')).status, 404);
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium', args:['--no-sandbox']});
  try {
    const tablet = await browser.newPage({viewport:{width:900,height:1200}});
    const tv = await browser.newPage({viewport:{width:1920,height:1080}});
    const errors = [];
    for (const page of [tablet, tv]) page.on('pageerror', error => errors.push(error.message));
    await tv.goto(preview + 'slideshow/');
    await tv.locator('.slide.active.welcome').waitFor();
    await tv.keyboard.press('ArrowRight');
    await tv.getByText('Be the first to have your say!').first().waitFor();
    await tv.keyboard.press('ArrowLeft');
    await tv.locator('.slide.active.results').waitFor({timeout:17000});
    assert.equal(await tv.locator('.slide').count(), 6);

    await tablet.goto(preview);
    await tablet.getByRole('button', {name: 'Start Survey'}).click();
    await pick(tablet, 0);
    await tablet.getByRole('button', {name: 'Next'}).click();
    await tablet.getByRole('button', {name: 'Back'}).click();
    assert(await tablet.getByRole('radio').first().isChecked());
    await pick(tablet, 1);
    await tablet.getByRole('button', {name: 'Next'}).click();
    for (let i = 1; i < 4; i++) {
      assert.match(await tablet.locator('.category').textContent(), new RegExp('QUESTION ' + (i + 1)));
      await assertFits(tablet, 'body', 'horizontal');
      assert((await tablet.locator('nav').boundingBox()).y + 48 < 1200);
      await pick(tablet, i);
      if (i < 3) await tablet.getByRole('button', {name: 'Next'}).click();
    }
    const complete = tablet.getByRole('button', {name:'Submit Answers'});
    await complete.evaluate(button => {button.click();button.click();});
    await tablet.locator('#restart').waitFor();
    assert.equal((await totals()).total, 1);
    await tablet.locator('#restart').click();
    await tablet.setViewportSize({width:390,height:844});
    await tablet.route('**/coslaconf-test-api/complete', async route => {
      const saved = await route.fetch();
      assert.equal(saved.status(), 200);
      await route.abort();
    });
    await fill(tablet, [0, 0, 0, 0]);
    await tablet.locator('#retry').waitFor();
    assert.equal((await totals()).total, 2);
    await assertFits(tablet, 'body', 'horizontal');
    await tablet.unroute('**/coslaconf-test-api/complete');
    await tablet.reload();
    await tablet.locator('#restart').waitFor();
    assert.equal((await totals()).total, 2);
    await tablet.getByRole('button', {name:'Start Survey'}).waitFor({timeout:17000});
    await tablet.getByRole('button', {name:'Start Survey'}).click();
    assert.equal(await tablet.locator('input:checked').count(), 0);

    assert.equal((await totals(origin + '/coslaconf-api/')).total, 0);
    assert.equal((await post(['C','A','A','A'])).status, 200);
    const duplicates = await Promise.all(Array.from({length:5}, () => post(['C','A','A','A'])));
    assert(duplicates.every(r => r.status === 200));
    assert.equal((await post(['B','A','A','A'])).status, 409);
    assert.deepEqual(await totals(), {total:3,questions:[
      {counts:[1,1,1,0,0]},{counts:[2,1,0,0,0]},{counts:[2,0,1,0,0]},{counts:[2,0,0,1,0]}
    ]});
    await tv.getByText('3 completed surveys').first().waitFor({timeout:12000});
    for (const title of ['Skills Gap','Investment','National Advantage','The Future']) {
      while (await tv.locator('.slide.active h1').textContent() !== title) await tv.keyboard.press('ArrowRight');
      assert.equal(await tv.locator('.slide.active .minor').count(),3);
      assert.equal(await tv.locator('.slide.active .chart-row').count(),5);
      await assertFits(tv, '.slide.active .minor, .slide.active .hero', 'vertical');
      if (title !== 'Skills Gap') assert.match(await tv.locator('.slide.active .small-list').textContent(), /Tie · Apprenticeships/);
    }
    await tv.keyboard.press('ArrowRight');
    await tv.getByText('£360 million+', {exact:true}).waitFor();
    await tv.keyboard.press('ArrowRight');
    await tv.locator('.slide.active.welcome').waitFor();
    await tv.keyboard.press('ArrowRight');
    await tv.route('**/coslaconf-test-api/display-results', route => route.abort());
    await tv.locator('.active .tag').filter({hasText:'RESULTS TEMPORARILY NOT UPDATING'}).waitFor({timeout:12000});
    assert.match(await tv.locator('.active .statusline').textContent(), /3 completed surveys/);
    await tv.unroute('**/coslaconf-test-api/display-results');
    await tv.locator('.active .tag').filter({hasText:'LIVE RESULTS'}).waitFor({timeout:12000});
    const live = await browser.newPage({viewport:{width:1600,height:900}});
    await live.goto(origin + '/coslaconf/slideshow/');
    await live.locator('.slide.active.welcome .qr-panel img').waitFor();
    assert.equal(await live.locator('.slide.active.welcome .qr-panel a').getAttribute('href'),
      'https://myjob.cosla.gov.uk/coslaconf/');
    await live.keyboard.press('ArrowRight');
    await live.locator('.active .results-qr img').waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS: tablet navigation, edits, submit, double click, manual and timed reset, lost acknowledgement and reload retry, mobile layout, invalid payloads, idempotency, isolated results, TV rotation, focus layouts, ties, zero state, refresh, outage recovery, production QR.');
  } finally {
    await browser.close();
  }
}
main().catch(error => {console.error(error);process.exitCode=1;});
