import { sh } from "https://cdn.jsdelivr.net/gh/quite4work/deno-shell-tag@0.0.3/mod.ts";
import * as path from "https://deno.land/std@0.92.0/path/mod.ts";

export async function cloneToTempDir(url) {
  const regularUrl = url.replace(/^git@/, "");
  const { pathname } = new URL(regularUrl);
  const [org, project] = pathname.split("/").filter(Boolean);
  const { name } = path.parse(project);
  const tmp = await Deno.makeTempDir({ prefix: `${org}_${name}-` });
  await sh`git clone --single-branch ${url} ${tmp}`;
  return tmp;
}
