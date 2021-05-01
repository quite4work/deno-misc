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

// https://github.com/golang/glog/blob/master/glog.go#L524
// Lmmdd hh:mm:ss.uuuuuu threadid file:line] msg...
const klog = () =>
  re`(?<level>[A-Z])(?<date>${month}${day})\\s+(?<time>${time})\\s+\\d+\\s+(?<file>${file}):(?<line>\\d+)\\].*`;

export { date, dateTime, file, klog, time };
