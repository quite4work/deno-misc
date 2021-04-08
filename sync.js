import * as path from "https://deno.land/std@0.92.0/path/mod.ts";
import * as fs from "https://deno.land/std@0.92.0/fs/mod.ts";
import { pathToRegexp } from "https://deno.land/x/path_to_regexp@v6.2.0/index.ts";
import { delay } from "https://deno.land/std@0.92.0/async/mod.ts";

export async function sync(src, dest, exclude) {
  const skip = exclude.map((e) =>
    pathToRegexp(path.join(src, e), [], { end: false })
  );
  await Deno.mkdir(dest, { recursive: true });
  const tasks = [];
  const mkdirTasks = {};
  const walk = fs.walk(src, { skip });
  for await (const { path: srcPath, isFile, isDirectory } of walk) {
    const relSrc = path.relative(src, srcPath);
    const destPath = path.join(dest, relSrc);
    if (isFile) {
      tasks.push(copy(srcPath, destPath, mkdirTasks));
    } else if (isDirectory && !mkdirTasks[destPath]) {
      mkdirTasks[destPath] = Deno.mkdir(destPath, { recursive: true });
    }
  }
  await Promise.all(tasks + Object.values(mkdirTasks));
}

async function copy(src, dest, mkdirTasks) {
  const srcInfo = await Deno.stat(src);
  let destInfo;
  try {
    destInfo = await Deno.stat(dest);
  } catch {}
  if (!destInfo || srcInfo.mtime > destInfo.mtime) {
    const dir = path.dirname(dest);
    if (!mkdirTasks[dir]) {
      mkdirTasks[dir] = Deno.mkdir(dir, { recursive: true });
    }
    await mkdirTasks[dir];
    await Deno.copyFile(src, dest);
  }
}
