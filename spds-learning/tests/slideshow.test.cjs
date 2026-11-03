const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../public/slideshow/slideshow.js'), 'utf8');
const config = require('../public/slideshow/playlist.json');
function environment(path = '/slideshow/') {
  const timers = [];
  const makeNode = () => ({style:{setProperty(){}}, classList:{add(){},remove(){}},setAttribute(){}, replaceChildren(node){this.child=node},append(){},textContent:''});
  const layers=[makeNode(),makeNode()]; const stage=makeNode(); const button=makeNode();
  const context = {
    location:{pathname:path,origin:'https://example.test',href:'https://example.test'+path},
    document:{getElementById:id=>id==='stage'?stage:button, querySelectorAll:selector=>selector==='.slide'?layers:[],
      createElement:makeNode, addEventListener(){}, body:makeNode()},
    window:{addEventListener(){}},innerWidth:1920,innerHeight:1080,
    Intl, URL, AbortSignal, Date, setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length},clearTimeout(){},
    fetch:async()=>{throw Error('offline')},
    Image:class {set src(value){this.onerror()}},
  };
  vm.createContext(context);
  vm.runInContext(source.replace(/\nstart\(\);\s*$/, ''), context);
  return {context,timers,layers};
}
(async()=>{
 const {context:c,timers,layers}=environment();
 c.input=config;
 vm.runInContext('playlist = validatePlaylist(input)',c);
 assert.equal(vm.runInContext('playlist.slides.length',c),6);
 assert.equal(vm.runInContext('playlist.slides.find(s=>s.type==="results").duration',c),30);
 assert.equal(config.slides.reduce((total, slide) => total + slide.duration, 0), 120);
 assert.deepEqual(config.slides.map(s => s.type), ['image','image','results','image','image','image']);
 assert.equal(vm.runInContext('endpoint',c),'/learning-api/display-results');
 const p=environment('/learning-preview/slideshow/');
 assert.equal(vm.runInContext('endpoint',p.context),'/learning-test-api/display-results');
 c.input={total:10,personalities:{EX:3,PP:2,CC:2,RT:1,SA:1,CH:1}};
 vm.runInContext('latest = validateTotals(input); lastUpdated = new Date()',c);
 c.input.total=11;
 assert.throws(()=>vm.runInContext('validateTotals(input)',c));
 await c.pollResults(); // Failure keeps previous figures and schedules another poll.
 assert.equal(vm.runInContext('latest.total',c),10);
 assert.equal(vm.runInContext('unavailable',c),true);
 assert.ok(timers.some(t=>t.ms===10000));
 c.fetch=async()=>({ok:true,json:async()=>({total:0,personalities:{EX:0,PP:0,CC:0,RT:0,SA:0,CH:0}})});
 await c.pollResults();
 assert.equal(vm.runInContext('latest.total',c),0);
 assert.equal(vm.runInContext('unavailable',c),false);
 // Missing image must resolve to a fallback and schedule the next slide.
 await c.advance();
 assert.ok(layers[1].child);
 assert.ok(timers.some(t=>t.ms===18000));
 vm.runInContext('resultsCard = () => document.createElement("div")',c);
 for(let i=0;i<6;i++) await c.advance();
 assert.equal(vm.runInContext('position',c),0); // Wraps back to the first slide.
 assert.ok(timers.some(t=>t.ms===30000));
 vm.runInContext('innerWidth=1280;innerHeight=720;fitStage()',c);
 assert.ok(vm.runInContext('stage.style.transform',c).includes('scale(0.666'));
 c.input={slides:[{type:'image',src:'slides/a.png',duration:18}]};
 assert.throws(()=>vm.runInContext('validatePlaylist(input)',c));
 console.log('Slideshow: playlist/timing, test/live routing, invalid data, stale results, recovery, missing images, looping and 16:9 scaling passed.');
})().catch(e=>{console.error(e);process.exit(1)});
