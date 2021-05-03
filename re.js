export function isRegexp(value) {
  return Object.prototype.toString.call(value) === "[object RegExp]";
}

export function re(strings, ...keys) {
  let result = strings[0];
  for (let i = 1; i < strings.length; i++) {
    const k = keys[i - 1];
    if (isRegexp(k)) {
      result += k.source;
    } else if (typeof k === "function") {
      result += k().source;
    } else if (typeof k === "object") {
      const [[k2, v]] = Object.entries(k);
      let v2;
      if (isRegexp(v)) {
        v2 = v.source;
      } else if (typeof v === "function") {
        v2 = v().source;
      } else {
        v2 = v.toString();
      }
      result += `(?<${k2}>${v2})`;
    } else {
      result += k.toString();
    }
    result += strings[i];
  }
  return new RegExp(result);
}

const year = () => /[12][0-9]{3}/;
const month = () => /(?:0[1-9]|1[0-2])/;
const day = () => /(?:0[1-9]|[1-2][0-9]|3[0-1])/;
const hours = () => /(?:0[0-9]|1[0-9]|2[0-4])/;
const minutes = () => /(?:[0-5][0-9])/;
const secounds = minutes;
const date = () => re`${year}-${month}-${day}`;
const time = () => re`${hours}:${minutes}:${secounds}(?:\.[0-9]{1,9})`;
const dateTime = () => re`${date}[_T ]${time}`;
const file = () => /[\w_]+\.\w+/;

// based on https://github.com/PrismJS/prism/blob/master/components/prism-log.js
const string = () => /"(?:[^"\\\r\n]|\\.)*"|'(?![st] | \w)(?:[^'\\\r\n]|\\.)*'/;
const uuid = () =>
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;
const filePath = () =>
  /\b[a-z]:[\\/][^\s|,;:(){}\[\]"']+|(^|[\s:\[\](>|])\.{0,2}\/\w[^\s|,;:(){}\[\]"']*/i;

// https://github.com/golang/glog/blob/master/glog.go#L524
// Lmmdd hh:mm:ss.uuuuuu threadid file:line] msg...
export function klog() {
  const level = /[A-Z]/;
  const line = /\d+/;
  const date = re`${month}${day}`;
  const log = /.*/;
  return re`${{ level }}${{ date }}\\s+${{ time }}\\s+\\d+\\s+${{ file }}:${{
    line,
  }}\\]\\s+${{ log }}`;
}

export function log() {
  return re`(${{ string }}|${{ uuid }}|${{ filePath }}|.)*`;
}

export { date, dateTime, file, time };
