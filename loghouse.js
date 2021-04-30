import { cac } from "https://unpkg.com/cac@6.7.3/mod.ts";
import * as csv from "https://deno.land/std@0.95.0/encoding/csv.ts";

const log = {
  exclude(strings, keys) {
    let command = strings[0];
    for (let i = 1; i < strings.length; i++) {
      command += keys[i - 1].toString();
      command += strings[i];
    }
    return command.split("\n")
      .filter((s) => {
        if (!s) return s;
        return !/^\s*\/\/.*/.test(s);
      })
      .map((k) => {
        const k2 = k.replaceAll(/['"]/g, "_");
        const k3 = k2.replaceAll(/\s*\/\/.*$/g, "");
        return `log != "%${k3}%"`;
      })
      .join(
        " and ",
      );
  },
};

export const query = { log };

export async function configure(host, auth, preQuery) {
  const cli = cac();
  cli.command("query [...string]")
    .option("-f, --from <from>", "Time from", {
      default: "now-1m",
    })
    .option("-t, --to <to>", "Time to", {
      default: "now",
    }).action((queryStrings, opts) =>
      queryCmd(host, auth, preQuery, queryStrings, opts)
    );
  cli.help();
  cli.parse();
}

export function buidQuery(query, res = []) {
  for (const [k, v] of Object.entries(query)) {
    if (Array.isArray(v)) {
      for (const x of v) {
        res.push(k.replace("{}", x));
      }
    } else {
      res.push(k + " " + v);
    }
  }
  return res.join(" and ");
}

async function queryCmd(host, auth, preQuery, queryStrings, { from, to }) {
  const queryString = queryStrings.join(" ");
  const shown_keys = [
    "source",
    "namespace",
    "host",
    "pod_name",
    "container_name",
    "stream",
    "log",
  ];
  let resQuery = "";
  if (queryString && preQuery) {
    resQuery = `${preQuery} and ${queryString}`;
  } else if (queryString) {
    resQuery = queryString;
  } else if (preQuery) {
    resQuery = preQuery;
  }
  console.log(`Query: ${resQuery}\n`);
  const qsObj = {
    time_format: "range",
    seek_to: "",
    time_from: from,
    time_to: to,
    query: resQuery,
    per_page: "",
    shown_keys,
  };
  const qsStr = new URLSearchParams(toQs(qsObj)).toString();
  const resp = await fetch(
    `https://${host}/query.csv?${qsStr}`,
    {
      credentials: "include",
      headers: {
        "Authorization": `Basic ${auth}`,
      },
      mode: "cors",
    },
  );
  const csvText = await resp.text();
  if (resp.status != 200) {
    console.log(`Error response: ${resp.status}`);
    return;
  }
  if (!csvText) {
    console.log("Empty response");
    return;
  }
  const logs = await csv.parse(csvText, { skipFirstRow: true });
  for (
    const {
      timestamp,
      source,
      namespace,
      host,
      pod_name,
      container_name,
      stream,
      log,
    } of logs
  ) {
    console.log(
      `* ${timestamp} ${host} ${stream} src:'${source}' ns:'${namespace}' pod:'${pod_name}' container:'${container_name}'`,
    );
    console.log(
      `${log}\n`,
    );
  }
}

function toQs(obj) {
  return Object.entries(obj).flatMap(([k, v]) => {
    if (Array.isArray(v)) {
      return v.map((v) => [k + "[]", v]);
    } else {
      return [[k, v]];
    }
  });
}
