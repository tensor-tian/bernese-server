import { Debug } from "@/util";
import Prism from "prismjs";
import loadAllLanguages from "prismjs/components/index"; // import all languages

const debug = Debug();
loadAllLanguages();

function tokensToString(tok: Prism.TokenStream): string {
  if (typeof tok === "string") {
    return tok;
  } else if (Array.isArray(tok)) {
    return tok
      .reduce((prev, t) => {
        const part = tokensToString(t).replace(
          /^(\s*)(.*?)(\s*)$/,
          (_match, p1, p2, p3) => {
            p1 = typeof p1 === "string" ? p1.replace(/[^\n]/, "") : "";
            p3 = typeof p3 === "string" ? p3.replace(/[^\n]/, "") : "";
            return p1 + p2 + p3;
          }
        );

        if (part.length === 0 || part === " ") {
          return prev;
        } else if (prev[prev.length - 1]?.endsWith(" ")) {
          prev.push(part);
        } else {
          prev.push(" ", part);
        }
        return prev;
      }, [] as string[])
      .join("");
  } else {
    return tokensToString(tok.content);
  }
}

const aliases: Record<string, string> = {
  golang: "go",
};

export default function codeSegmentation(
  code: string,
  language = "clike"
): string {
  language = language.toLowerCase();
  if (aliases[language]) {
    language = aliases[language] as string;
  }
  const grammar =
    Prism.languages[language] || (Prism.languages["clike"] as Prism.Grammar);
  debug(
    "languages: ",
    language,
    Object.keys(Prism.languages).includes(language)
  );
  const tokens = Prism.tokenize(code, grammar);
  return tokensToString(tokens);
}
