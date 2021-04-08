import { sh } from "https://denopkg.com/quite4work/deno-shell-tag";

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
