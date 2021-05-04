import {
  ish,
  sh,
} from "https://cdn.jsdelivr.net/gh/quite4work/deno_shell_tag@0.0.3/mod.ts";
import { delay } from "https://deno.land/std@0.95.0/async/mod.ts";

// DWIM function
export async function start() {
  let down;
  try {
    await sh`docker info`;
    down = false;
  } catch {
    await ish`open --hide --background -a Docker`;
    down = true;
  }
  while (down) {
    try {
      await delay(1000);
      await sh`docker info`;
      down = false;
    } catch {
      console.log("waiting docker to start");
      down = true;
    }
  }
}
