import { serve } from "https://deno.land/std@0.95.0/http/server.ts";
import { StringReader } from "https://deno.land/std@0.95.0/io/mod.ts";

export async function http(
  callback,
  localPort,
  remotePort,
  remoteHost = "127.0.0.1",
) {
  const s = serve({ port: localPort });
  for await (const req of s) {
    try {
      handle(callback, req, remotePort, remoteHost);
    } catch (err) {
      console.log(err);
    }
  }
}

async function handle(callback, req, remotePort, remoteHost) {
  let cb_res;
  try {
    cb_res = await callback(req);
  } catch (err) {
    console.log(err);
  }
  if (cb_res == undefined) {
    const { url, method, headers } = req;
    const body = req.body ? await Deno.readAll(req.body) : undefined;
    const req_url = `http://${remoteHost}:${remotePort}` + url;
    const res = await fetch(req_url, { method, headers, body });
    req.respond({
      body: new StringReader(await res.text()),
      headers: res.headers,
      status: res.status,
    });
  }
}
