import { DEFAULT_SCHEMA } from "https://deno.land/std@0.94.0/encoding/yaml.ts";
import { Type } from "https://deno.land/std@0.94.0/encoding/_yaml/type.ts";
import { promptSecret } from "https://denopkg.com/quite4work/deno-prompts";
import { configure } from "./yaml.js";

// DWIM function
export async function getPass() {
  let pass = Deno.env.get("ANSIBLE_VAULT_PASSWORD_FILE");
  if (pass) {
    const p = Deno.run({ cmd: [pass], stdout: "piped" });
    const out = await p.output();
    pass = new TextDecoder().decode(out).trim();

    // unset these variables to fix bugs in some playbooks
    Deno.env.delete("ANSIBLE_VAULT_PASSWORD_FILE");
    Deno.env.delete("ANSIBLE_ASK_VAULT_PASS");
  } else {
    pass = await promptSecret("Vault password:");
    console.log(""); // fix bug of promptSecret
  }
  return pass;
}

const VaultType = new Type("!vault", {
  kind: "scalar",
  resolve(data) {
    return /\$ANSIBLE_VAULT/.test(data);
  },
  predicate(data) {
    return /\$ANSIBLE_VAULT/.test(data);
  },
});
const schema = DEFAULT_SCHEMA.extend({ explicit: [VaultType] });
const yaml = configure({ schema });

export { yaml };
