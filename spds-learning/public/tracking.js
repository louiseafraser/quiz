// A small anonymous retry queue only. Authoritative totals live on the server.
// Test/live use distinct URLs and queue keys so test retries cannot enter live totals.
const trackingApi = location.pathname.startsWith('/learning-preview/') ? '/learning-test-api' : '/learning-api';
const queueKey = 'spds-learning-pending-v1-' + trackingApi;
let pending = [];
try { pending = JSON.parse(localStorage.getItem(queueKey) || '[]'); } catch (_) {}
if (!Array.isArray(pending)) pending = [];
let sending = false;
function savePending() {
  try { localStorage.setItem(queueKey, JSON.stringify(pending)); } catch (_) {}
}
function queueCompletion(id, personality) {
  if (!pending.some(item => item.id === id)) pending.push({id, personality});
  savePending();
  flushCompletions();
}
async function flushCompletions() {
  if (sending || !pending.length) return;
  sending = true;
  try {
    while (pending.length) {
      const item = pending[0];
      const response = await fetch(trackingApi + '/complete', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(item), signal: AbortSignal.timeout(6000)
      });
      if (!response.ok) break;
      pending.shift();
      savePending();
    }
  } catch (_) { /* Retry on connectivity returning, next load or the timer. */ }
  finally { sending = false; }
}
window.addEventListener('online', flushCompletions);
setInterval(flushCompletions, 15000);
flushCompletions();
