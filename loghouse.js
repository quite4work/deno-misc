import { cac } from "https://unpkg.com/cac@6.7.3/mod.ts";
import * as csv from "https://deno.land/std@0.95.0/encoding/csv.ts";
import { writeAll } from "https://deno.land/std@0.95.0/io/util.ts";
import * as highlight from "./highlight.js";
import * as re from "./re.js";
// import { Webview } from "https://deno.land/x/webview@0.5.6/mod.ts";
import { open } from "https://deno.land/x/opener/mod.ts";
import * as fs from "https://deno.land/std@0.95.0/fs/mod.ts";

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

export function configure(
  { host, auth, query: preQuery, output = "log.html", format = "full" },
) {
  const cli = cac();
  cli.command("[...string]")
    .option("-f, --from <from>", "Time from", {
      default: "now-1m",
    })
    .option("--host <from>", "Host", {
      default: host,
    })
    .option("--auth <auth>", "Auth token", {
      default: auth,
    })
    .option("-t, --to <to>", "Time to", {
      default: "now",
    })
    .option("-o, --output <output>", "Output file name", {
      default: output,
    })
    .option("--format <format>", "Format", {
      default: format,
    }).action((queryStrings, opts) => queryCmd(preQuery, queryStrings, opts));
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
  preQuery,
  queryStrings,
  { host, auth, from, to, format, output },
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
  const outFileExisted = await fs.exists(output);
  try {
    if (format === "html") {
      outFile = await Deno.open(output, {
        truncate: true,
        create: true,
        write: true,
      });
      await addHtmlHeader(outFile);
      const header =
        `Query: <pre style="white-space: pre-wrap"><code class="sql">${resQuery}</code></pre>`;
      await writeAll(outFile, new TextEncoder().encode(header));
    } else {
      console.log(`Query: ${resQuery}\n`);
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
      const details =
        `${timestamp} host = "${host}" stream = "${stream}" source = "${source}" namespace = "${namespace}" pod_name = "${pod_name}" container_name = "${container_name}"`;
      if (format === "full") {
        console.log(`* ${details}\n${log}\n`);
      } else if (format === "short") {
        console.log(`|${log} // ${details}`);
      } else if (format === "mini") {
        console.log(`|${log}`);
      } else if (outFile) {
        const log2 = higligthLog(log);
        const line =
          `<details style="white-space: nowrap"><summary><code>${log2}</code></summary><code>* ${details}</code></details>`;
        await writeAll(outFile, new TextEncoder().encode(line));
      }
    }
  } finally {
    if (outFile) {
      await writeAll(outFile, new TextEncoder().encode("</body>"));
      Deno.close(outFile.rid);
      console.log(`open ${output}`);
      if (!outFileExisted) {
        await open(output);
      }
      // const html = await Deno.readTextFile(output);
      // const webview = new Webview({
      //   url: `data:text/html,${encodeURIComponent(html)}`,
      // });
      // webview.setMaximized(true);
      // await webview.run();
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
    file: "green",
    line: "blue",
  });
}

async function addHtmlHeader(outFile) {
  const line = `
<!DOCTYPE html>
<html>
<head>
<link rel="stylesheet" href="https://unpkg.com/@highlightjs/cdn-assets@10.7.2/styles/idea.min.css">
<link href="themes/prism.css" rel="stylesheet" />
</head>
<body>
<script src="https://unpkg.com/@highlightjs/cdn-assets@10.7.2/highlight.min.js"></script>
<script src="https://unpkg.com/@highlightjs/cdn-assets@10.7.2/languages/sql.min.js"></script>
<script>hljs.highlightAll();</script>
`;
  await writeAll(outFile, new TextEncoder().encode(line));
}
