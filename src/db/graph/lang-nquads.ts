// https://www.w3.org/TR/n-quads/#grammar-production-IRIREF
// https://github.com/cayleygraph/quad/blob/master/nquads/nquads.rl

const STATE = {
  words: [" ", "\t", "\r", "\n", "\\<", "\\>", "\\", '"'],
  escape: new Map<string, string>(),
  unescape: new Map<string, string>(),
  reg: null as null | RegExp,
};

(() => {
  const parts: string[] = [];
  STATE.words.forEach((c) => {
    const e = `%${c.codePointAt(c.length - 1)}`;
    STATE.escape.set(c, e);
    STATE.unescape.set(e, c);
    parts.push(e);
  });
  STATE.reg = new RegExp(parts.join("|"), "g");
})();

export function encode(word: string): string {
  return word.replace(
    /[\t\n\r "\\]|(\\[<>])/g,
    (c) => STATE.escape.get(c) as string
  );
}

export function decode(word: string): string {
  return word.replace(
    // /%9|%13|%32|%10|%60|%62|%92|%34/g,
    STATE.reg!,
    (e) => STATE.unescape.get(e) as string
  );
}
