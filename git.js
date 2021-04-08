import { sh } from "https://denopkg.com/quite4work/deno-shell-tag";

export async function cloneToTempDir(url) {
  const regularUrl = url.replace(/^git@/, "");
  const { pathname } = new URL(regularUrl);
  const [org, project] = pathname.split("/").filter(Boolean);
  const { name } = path.parse(project);
  const tmp = await Deno.makeTempDir({ prefix: `${org}_${name}-` });
  await sh`git clone --single-branch ${url} ${tmp}`;
  return tmp;
}
