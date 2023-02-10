import yaml from "js-yaml";

export const metaMD = {
  dump(metadata: unknown, markdown: string): string {
    const meta = yaml.dump(metadata, {
      forceQuotes: true,
    });
    return `---
${meta}    
---

${markdown}
`;
  },
  parse<T>(str: string): { metadata: null | T; markdown: string } {
    if (str.slice(0, 3) !== "---") {
      return {
        metadata: null,
        markdown: str,
      };
    }
    const matcher = /\n(-{3})/g;
    const metaEnd = matcher.exec(str);

    const markdown = str.slice(matcher.lastIndex);
    if (!metaEnd) {
      return {
        metadata: null,
        markdown,
      };
    }
    const metadata = yaml.load(str.slice(0, metaEnd.index)) as T;
    return {
      metadata,
      markdown,
    };
  },
};
