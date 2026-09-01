export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/gexport/')) {
      const path = url.pathname.replace(/^\/gexport/, '')
      const target = `https://docs.google.com${path}${url.search}`
      const res = await fetch(target, { redirect: 'follow', cache: 'no-store' })
      return new Response(res.body, {
        status: res.status,
        headers: {
          'content-type': res.headers.get('content-type') || 'text/csv; charset=utf-8',
          'cache-control': 'no-store',
        },
      })
    }
    return env.ASSETS.fetch(request)
  },
}
