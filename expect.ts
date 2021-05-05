// deno-lint-ignore-file no-explicit-any

import { readLines } from "https://deno.land/std@0.95.0/io/mod.ts";
async function log(proc: Deno.Process) {
  for await (const line of readLines(proc.stdout)) {
    console.log(line);
  }
}

export async function spawn(command: string) {
  const proc = Deno.run({
    cmd: [
      "/bin/sh",
      "-c",
      `expect -f -`,
    ],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  });
  log(proc);

  await evalF(proc, `set timeout -1`);
  await evalF(proc, `spawn ${command}`);

  return {
    expectBefore(args: [any]) {
      return expectBefore(proc, args);
    },
    expectAfter(args: [any]) {
      return expectAfter(proc, args);
    },
    expect(command: string) {
      return expectF(proc, command);
    },
    send(command: string) {
      return sendF(proc, command);
    },
    exit() {
      return exit(proc);
    },
  };
}

async function expectBefore(proc: Deno.Process, args: [any]) {
  const cmds = args.map(({ expect, send }) => {
    const textEsc = escape(expect);
    const sendEsc = escape(send);
    return `"${textEsc}" {send "${sendEsc}\\r"; exp_continue}`;
  });
  return await evalF(
    proc,
    `expect_before {${cmds.join(" ")}}`,
  );
}

async function expectAfter(proc: Deno.Process, args: [any]) {
  const cmds = args.map(({ expect, send }) => {
    const textEsc = escape(expect);
    const sendEsc = escape(send);
    return `"${textEsc}" {send "${sendEsc}\\r"; exp_continue}`;
  });
  return await evalF(
    proc,
    `expect_after {${cmds.join(" ")}}`,
  );
}

async function expectF(proc: Deno.Process, text: string) {
  const textEsc = escape(text);
  return await evalF(proc, `expect "${textEsc}"`);
}

async function sendF(proc: Deno.Process, text: string) {
  const textEsc = escape(text);
  return await evalF(proc, `send -- "${textEsc}\\r"`);
}

async function exit(proc: Deno.Process) {
  await evalF(proc, 'expect { "$ " {exit 0} eof {exit 0} }');
  proc.stdin.close();
  const { code } = await proc.status();

  if (code != 0) {
    const stderr = await proc.stderrOutput();
    const error = new TextDecoder().decode(stderr).trim();
    throw new Error(`Non-zero exit code: ${code} ${error}`);
  }
  proc.stdout.close();
  proc.close();
  return code;
}

async function evalF(proc: Deno.Process, command: string) {
  await proc.stdin.write(
    new TextEncoder().encode(command + "\n"),
  );
}

function escape(text: string) {
  return JSON.stringify(text).slice(1, -1).replaceAll("[", "\\[");
}
