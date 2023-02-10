import { Debug } from "@/util";
import Path from "path";
import codeSegmentation from "./code-segmentation";
import fs from "fs/promises";

const debug = Debug();

test("tokenize", async () => {
  const tsCode = await fs.readFile(
    Path.resolve(__dirname, "code-ts-for-test"),
    "utf-8"
  );
  debug("tokens: %s", codeSegmentation(tsCode, "typescript"));

  const goCode = await fs.readFile(
    Path.resolve(__dirname, "code-golang-for-test"),
    "utf-8"
  );
  debug("tokens: %s", codeSegmentation(goCode, "golang"));

  const javaCode = await fs.readFile(
    Path.resolve(__dirname, "code-java-for-test"),
    "utf-8"
  );
  debug("tokens: %s", codeSegmentation(javaCode, "java"));
});
