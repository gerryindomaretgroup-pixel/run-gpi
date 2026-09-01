export async function onRequest(context) {
  const incoming = new URL(context.request.url)
  const path = incoming.pathname.replace(/^\/gexport/, '') || '/'
  const target = `https://docs.google.com${path}${incoming.search}`
  const res = await fetch(target, { redirect: 'follow' })
  const headers = new Headers()
  headers.set('content-type', res.headers.get('content-type') || 'text/csv; charset=utf-8')
  headers.set('cache-control', 'no-store')
  headers.set('access-control-allow-origin', '*')
  return new Response(res.body, { status: res.status, headers })
}
