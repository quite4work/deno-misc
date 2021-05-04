import * as yaml from "https://deno.land/std@0.95.0/encoding/yaml.ts";

export async function read(file, opts) {
  let schema;
  if (opts) {
    schema = opts.schema;
  }
  const yml = await Deno.readTextFile(file);
  return yaml.parse(yml, { schema });
}

export async function write(file, obj, opts) {
  let schema;
  if (opts) {
    schema = opts.schema;
  }
  const yml = yaml.stringify(obj, {
    schema,
    noRefs: true, // don't convert duplicate objects into references
    noCompatMode: true, // don't quote "yes", "no" and so on, as required for YAML 1.1
  });
  await Deno.writeTextFile(file, yml);
}

export async function edit(file, func, opts) {
  let yml = await read(file, opts);
  let res = await func(yml, opts);
  if (res) {
    yml = res;
  }
  await write(file, yml, opts);
}

export function configure(defaultOpts) {
  return {
    read(file, opts) {
      read(file, { ...opts, ...defaultOpts });
    },
    write(file, obj, opts) {
      write(file, obj, { ...opts, ...defaultOpts });
    },
    edit(file, func, opts) {
      edit(file, func, { ...opts, ...defaultOpts });
    },
  };
}
