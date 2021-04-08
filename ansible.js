import { promptSecret } from "https://denopkg.com/quite4work/deno-prompts";

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
