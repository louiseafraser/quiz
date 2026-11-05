const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require.resolve('../public/tracking.js'),'utf8');
const storage=new Map();
const receipts=new Set();
let available=false, requests=0;
function load(path='/') {
 const context={location:{pathname:path},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},
   AbortSignal,window:{addEventListener(){}},setInterval(){},fetch:async(_url,options)=>{
     requests++;
     if(!available) throw Error('offline');
     receipts.add(JSON.parse(options.body).id);
     return {ok:true};
   }};
 vm.createContext(context); vm.runInContext(source,context); return context;
}
(async()=>{
 let c=load(); c.queueCompletion('one','EX');
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(receipts.size,0);
 assert.equal(JSON.parse(storage.get('spds-learning-pending-v1-/learning-api')).length,1);
 available=true;
 c=load(); // Refresh restores pending submission.
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(receipts.size,1);
 assert.equal(JSON.parse(storage.get('spds-learning-pending-v1-/learning-api')).length,0);
 const before=requests;
 load();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(requests,before); // Acknowledged completion is not retried on refresh.
 available=false;
 c=load('/learning-preview/'); c.queueCompletion('test-only','RT');
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(JSON.parse(storage.get('spds-learning-pending-v1-/learning-test-api')).length,1);
 available=true; load('/');
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(receipts.has('test-only'),false);
 console.log('Offline persistence, refresh retry, acknowledged refresh and test/live queue separation passed.');
})().catch(e=>{console.error(e);process.exit(1)});
