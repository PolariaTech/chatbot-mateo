export class NextResponse extends Response {
  static json(body, init = {}) {
    const headers = new Headers(init.headers)
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    return new Response(JSON.stringify(body), {
      status: init.status ?? 200,
      headers,
    })
  }
}
