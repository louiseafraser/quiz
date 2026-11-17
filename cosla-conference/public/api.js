export const preview = location.pathname.startsWith('/coslaconf-preview/');
export const api = preview ? '/coslaconf-test-api/' : '/coslaconf-api/';
export async function json(url, options) {
  const response = await fetch(url, {cache: 'no-store', signal: AbortSignal.timeout(8000), ...options});
  if (!response.ok) throw new Error('HTTP ' + response.status);
  return response.json();
}
