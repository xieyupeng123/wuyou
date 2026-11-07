const WORKER_ORIGIN = "https://wuyou-api.3259685759.workers.dev";

export async function onRequest(context) {
  const { request } = context;
  const incoming = new URL(request.url);
  const target = new URL(WORKER_ORIGIN);
  target.pathname = incoming.pathname;
  target.search = incoming.search;

  const headers = new Headers(request.headers);
  const forwardedFor = headers.get("cf-connecting-ip") || headers.get("x-forwarded-for") || "";
  const country = headers.get("cf-ipcountry") || (request.cf && request.cf.country) || "";
  if (forwardedFor) headers.set("x-wuyou-client-ip", forwardedFor);
  headers.set("x-wuyou-public-origin", incoming.origin);
  if (country) headers.set("x-wuyou-country", String(country));
  headers.delete("host");
  headers.delete("content-length");
  headers.delete("cf-connecting-ip");
  headers.delete("x-forwarded-for");
  headers.delete("cf-ray");
  headers.delete("cf-visitor");

  const init = {
    method: request.method,
    headers,
    redirect: "manual"
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const response = await fetch(target.toString(), init);
  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");
  responseHeaders.delete("transfer-encoding");
  responseHeaders.set("Access-Control-Allow-Origin", "*");

  return new Response(request.method === "HEAD" ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders
  });
}
