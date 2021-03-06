export async function replaceInFile(file, regex, replacement = "") {
  const text = await Deno.readTextFile(file);
  const newText = text.replace(regex, replacement);
  if (text == newText) {
    return false;
  } else {
    await Deno.writeTextFile(file, newText);
    return true;
  }
}

export function join(arrayOrAny, sep = ",") {
  if (Array.isArray(arrayOrAny)) {
    return arrayOrAny.join(sep);
  }
  return arrayOrAny.toString();
}

export function joinTagArgs(strings, keys) {
  let result = strings[0];
  for (let i = 1; i < strings.length; i++) {
    result += keys[i - 1].toString();
    result += strings[i];
  }
  return result;
}
