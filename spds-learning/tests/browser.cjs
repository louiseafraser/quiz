const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const {questions,results} = require('../public/quiz-data.js');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:912,height:1368},isMobile:false,hasTouch:true});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const receipts=new Set(); let submissions=0; let available=true;
 await page.route('**/learning-api/complete',async route=>{
   if(!available) return route.abort('failed');
   submissions++;
   receipts.add(route.request().postDataJSON().id);
   await route.fulfill({json:{recorded:true}});
 });
 await page.goto(process.env.QUIZ_URL || 'http://127.0.0.1:8090/');
 for(const [index,id] of Object.keys(results).entries()) {
   if(index===5) available=false;
   await page.getByRole('button',{name:'Tap to Start'}).click();
   for(const q of questions) {
     await page.getByRole('heading',{name:q.text,exact:true}).waitFor();
     assert.equal(await page.locator('.answerButton').count(),6);
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
     assert.ok(await page.evaluate(()=>document.querySelector('.footerLogo').getBoundingClientRect().height>=0));
     const answer=q.answers.find(a=>a.main===id);
     await page.getByRole('button',{name:'✨ '+answer.text,exact:true}).click();
   }
   await page.locator('#loadingScreen.active').waitFor();
   await page.locator('#resultScreen.active').waitFor();
   assert.equal(await page.locator('#resultTitle').innerText(),results[id].title);
   assert.equal(await page.locator('#resultSummary').innerText(),results[id].summary);
   assert.equal(await page.locator('#resultScreen img').count(),1); // footer only
   await page.getByRole('button',{name:'Restart Quiz'}).click();
   assert.equal(await page.locator('#resultTitle').innerText(),'');
   if(index===5) {
     assert.equal(receipts.size,5);
     available=true;
     await page.reload();
     await page.waitForFunction(()=>JSON.parse(localStorage.getItem('spds-learning-pending-v1-/learning-api')||'[]').length===0);
   }
 }
 assert.equal(receipts.size,6);
 assert.equal(submissions,6);
 for(const size of [{width:768,height:1024},{width:720,height:1080}]) {
   await page.setViewportSize(size);
   await page.getByRole('button',{name:'Tap to Start'}).click();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const buttons=await page.locator('.answerButton').all();
   for(const button of buttons) assert.ok((await button.boundingBox()).height>=48);
   await page.evaluate(()=>restartQuiz());
 }
 assert.deepEqual(errors,[]);
 console.log('Browser: six full quiz outcomes, restart, offline refresh retry, exactly six receipts, portrait widths and touch targets passed.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
