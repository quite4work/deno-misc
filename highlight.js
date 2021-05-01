export function html(text, regex, colors) {
  let res = text;
  const { groups } = regex.exec(text);
  for (const [k, v] of Object.entries(groups)) {
    const color = colors[k];
    if (v && color) {
      // TODO: replace using match position
      res = res.replace(
        v,
        `<div style="display:inline;color:${color};">${v}</div>`,
      );
    }
  }
  return res;
}
