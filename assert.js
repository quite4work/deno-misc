import { assertStringIncludes } from "https://deno.land/std@0.92.0/testing/asserts.ts";

export async function pageIncludes(url, text) {
  let resp = await fetch(url);
  let body = await resp.json();
  if (Array.isArray(text)) {
    for (const i of text) {
      assertStringIncludes(body, i, `ur ${url} douesnt include: ${i}`);
    }
  } else if (typeof text === "string") {
    assertStringIncludes(body, i, `url ${url} douesnt include: ${text}`);
  } else {
    throw ("badarg");
  }
}