export function html(text, regex, colors) {
  let res = text;
  const insert = {};
  const match = text.match(new RegExp(regex, "d"));
  if (match) {
    for (const [k, v] of Object.entries(match.indices.groups)) {
      const color = colors[k];
      // if (color.$) {
      //   res = html(res, color.$, color);
      // } else {
      let o = "", c = "";
      if (color) {
        o = `<span style="color:${color}">`;
        c = `</span>`;
      }
      if (v) {
        if (insert[v[0]]) {
          insert[v[0]] = `${c}${o}`;
        } else {
          insert[v[0]] = `${o}`;
        }
        if (insert[v[1]]) {
          insert[v[1]] = `${c}${o}`;
        } else {
          insert[v[1]] = `${c}`;
        }
      }

      // }
    }
    res = insertTextAtIndices(res, insert);
  }
  return res;
}

function insertTextAtIndices(str, text) {
  const entr = Object.entries(text);
  const chanks = splitAt(str, ...entr.map(([k]) => Number(k)));
  let res = "";
  for (const [i, v] of entr.map(([_, v], i) => [i, v])) {
    res += chanks[i] + v;
  }
  return res;
}

function splitAt(slicable, ...indices) {
  return [0, ...indices].map((n, i, m) => slicable.slice(n, m[i + 1]));
}
