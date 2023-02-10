import { Debug } from "@/util";
import fs from "fs";
import path from "path";
import prepareMarkdown from "./markdown";

const debug = Debug();

test("markdown segmentation code", () => {
  const md = fs.readFileSync(path.join(__dirname, "data/markdown.md"), "utf8");
  debug(prepareMarkdown(md));
});
