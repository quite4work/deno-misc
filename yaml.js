import * as yaml from "https://deno.land/std@0.92.0/encoding/yaml.ts";

export async function read(file) {
  const yml = await Deno.readTextFile(file);
  return yaml.parse(yml);
}

export async function write(file, obj) {
  const yml = yaml.stringify(obj, {
    noRefs: true, // don't convert duplicate objects into references
    noCompatMode: true, // don't quote "yes", "no" and so on, as required for YAML 1.1
  });
  await Deno.writeTextFile(file, yml);
}

export async function edit(file, func) {
  let yml = await readYaml(file);
  let res = await func(yml);
  if (res) {
    yml = res;
  }
  await writeYaml(file, yml);
}
