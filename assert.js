import {
  assert,
  assertStringIncludes,
} from "https://deno.land/std@0.92.0/testing/asserts.ts";
import * as adhoc from "./adhoc.js";

export async function replaceInFile(file, regex, replacement) {
  return assert(await adhoc.replaceInFile(file, regex, replacement));
}

export async function pageIncludes(url, text) {
  const resp = await fetch(url);
  const body = await resp.text();
  if (Array.isArray(text)) {
    for (const i of text) {
      assertStringIncludes(body, i, `ur ${url} douesnt include: ${i}`);
    }
  } else if (typeof text === "string") {
    assertStringIncludes(body, text, `url ${url} douesnt include: ${text}`);
  } else {
    throw ("badarg");
  }
}
