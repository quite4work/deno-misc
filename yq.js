import sh from "https://cdn.jsdelivr.net/gh/quite4work/deno_shell_tag@0.0.3/mod.ts";
import { expandGlob } from "https://deno.land/std@0.92.0/fs/mod.ts";

let yqVer = "v4.6.0";

let res = await (await expandGlob(`/tmp/deno-yq-${yqVer}_*`)).next();
let yqPath;

if (res.value) {
  yqPath = res.value.path + "/yq";
} else {
  const tempDir = await Deno.makeTempDir({
    dir: "/tmp",
    prefix: `deno-yq-${yqVer}_`,
  });
  const res = await fetch(
    `https://github.com/mikefarah/yq/releases/download/${yqVer}/yq_darwin_amd64`,
  );
  const yqBin = new Uint8Array(await res.arrayBuffer());
  await Deno.writeFile(tempDir + "/yq", yqBin);
  Deno.chmod(tempDir + "/yq", 0o744);
  yqPath = tempDir + "/yq";
}

function yq(stdin, opts) {
  return async function ([first, ...rest], ...keys) {
    let expr = first;
    let env = "";
    keys.forEach((k, i) => {
      switch (typeof k) {
        case "boolean":
        case "number":
          expr += k.toString() + rest[i];
          break;
        case "string":
          if (k.match(/^[\.\[\]\d\w]+$/)) {
            expr += k + rest[i];
          } else {
            expr += `env(yq${i})` + rest[i];
            env += `yq${i}=${
              JSON.stringify(k).replaceAll("{{", "'{{").replaceAll("}}", "}}'")
            } `;
          }
          break;
        case "object":
          let tmpl = objectMap(k, (k, v, i2) => {
            env += `yq${i}o${i2}=${
              JSON.stringify(v).replaceAll("{{", "'{{").replaceAll("}}", "}}'")
            } `;
            return [k, `åenv(yq${i}o${i2})å`];
          });
          tmpl = JSON.stringify(tmpl).replaceAll('"å', "").replaceAll('å"', "");
          expr += `${tmpl}` + rest[i];
          break;
        default:
          throw `unsupported type: ${typeof k}`;
      }
    });
    stdin = stdin.replaceAll("{{", "'{{").replaceAll("}}", "}}'");
    expr = expr.replaceAll('\\"', "¨");
    if (opts && opts.debug) {
      console.log(
        `echo ${JSON.stringify(stdin)} | ${env} ${yqPath} eval '${expr}' -`,
      );
    }
    let res = await sh(stdin)`${env} ${yqPath} eval '${expr}' -`;
    res = res.replace(/[\'\"]\{\{/g, "{{").replace(/\}\}[\'\"]/g, "}}")
      .replaceAll(
        "¨",
        '"',
      );
    if (res === "null") {
      return null;
    } else {
      return res;
    }
  };
}

function objectMap(obj, fn) {
  return Object.fromEntries(
    Object.entries(obj).map(
      ([k, v], i) => fn(k, v, i),
    ),
  );
}

export default yq;
