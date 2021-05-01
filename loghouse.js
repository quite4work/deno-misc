import { cac } from "https://unpkg.com/cac@6.7.3/mod.ts";
import * as csv from "https://deno.land/std@0.95.0/encoding/csv.ts";
import { writeAll } from "https://deno.land/std@0.95.0/io/util.ts";
import * as highlight from "./highlight.js";
import * as re from "./re.js";

function concat(strings, keys) {
  let result = strings[0];
  for (let i = 1; i < strings.length; i++) {
    result += keys[i - 1].toString();
    result += strings[i];
  }
  return result;
}

const log = {
  include(strings, ...keys) {
    return concat(strings, keys).split("\n")
      .filter((s) => {
        if (!s.trim()) return false;
        return !/^\s*\/\/.*/.test(s);
      })
      .map((k) => {
        const k2 = k.replaceAll(/['"]/g, "_");
        const k3 = k2.replaceAll(/\s*\/\/.*$/g, "");
        return `log = "%${k3}%"`;
      })
      .join(
        " or ",
      );
  },
  exclude(strings, ...keys) {
    return concat(strings, keys).split("\n")
      .filter((s) => {
        if (!s.trim()) return false;
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

export function configure(host, auth, preQuery) {
  const cli = cac();
  cli.command("query [...string]")
    .option("-f, --from <from>", "Time from", {
      default: "now-1m",
    })
    .option("-t, --to <to>", "Time to", {
      default: "now",
    })
    .option("--format <format>", "Format", {
      default: "mini",
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

async function queryCmd(
  host,
  auth,
  preQuery,
  queryStrings,
  { from, to, format },
) {
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
  let outFile;
  try {
    if (format === "html") {
      outFile = await Deno.open("out.html", {
        truncate: true,
        create: true,
        write: true,
      });
    }
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
      if (format === "full") {
        console.log(
          `* ${timestamp} host = "${host}" stream = "${stream}" source = "${source}" namespace = "${namespace}" pod_name = "${pod_name}" container_name = "${container_name}"`,
        );
        console.log(
          `${log}\n`,
        );
      } else if (format === "short") {
        console.log(
          `${log} // ${timestamp} host = "${host}"  stream = "${stream}" stream = "${source}" namespace = "${namespace}" pod_name = "${pod_name}" container_name = "${container_name}"`,
        );
      } else if (format === "mini") {
        console.log(`|${log}`);
      } else if (outFile) {
        const log2 = higligthLog(log);
        const line =
          `<details style="white-space: nowrap"><summary>${log2}</summary>* ${timestamp} ${host} ${stream} source:'${source}' namespace:'${namespace}' pod_name:'${pod_name}' container_name:'${container_name}</details>`;
        await writeAll(outFile, new TextEncoder().encode(line));
      }
    }
  } finally {
    if (outFile) {
      Deno.close(outFile.rid);
    }
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

function higligthLog(str) {
  return highlight.html(str, re.klog(), {
    time: "blue",
    date: "blue",
    level: "green",
    file: "geen",
    line: "green",
  });
}
