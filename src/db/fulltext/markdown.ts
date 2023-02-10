import codeSegmentation from "./code-segmentation";
import { marked } from "marked";

// import { Debug } from "@/util";
// const debug = Debug();
const walkTokens = (token: marked.Token) => {
  if (token.type === "code") {
    token.text = codeSegmentation(token.text, token.lang);
  }
};
function renderBlock(text: string) {
  return text + "\n";
}
function renderInline(text: string) {
  return text;
}

const renderer: Record<string, (...args: any[]) => string> = {
  code: (code: string, language: string) => {
    return `\`\`\`${language}\n${code}\`\`\`\n`;
  },
  hr: () => {
    return "\n";
  },
  br: () => {
    return "\n";
  },

  checkbox: () => "",
};
[
  "strong",
  "em",
  "codespan",
  "del",
  "html",
  "text",
  "link",
  "image",
  "br",
  "tablecell",
].forEach((prop) => (renderer[prop] = renderInline));
[
  "blockquote",
  "heading",
  "list",
  "listitem",
  "paragraph",
  "table",
  "tablerow",
].forEach((prop) => (renderer[prop] = renderBlock));

marked.use({ walkTokens, renderer });

export default function prepareMarkdown(md: string) {
  return marked.parse(md);
}
