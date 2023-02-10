import { BFulltextId } from "@/db/schema/fulltext";
import { Debug } from "@/util";
import { HTTPClient } from "@/util";
import { baseURL } from "@/setting";
import fs from "fs/promises";
import prepareMarkdown from "./markdown";

const debug = Debug();

const http = new HTTPClient(baseURL.fulltext);

export type AddDocReq = {
  id: number;
  doc: {
    content: string;
    tokens: { text: string; locations: number[] }[];
    labels: string[];
    fields: any;
  };
};

export const updateFulltextDoc = async (id: number) => {
  const text = await fs.readFile(BFulltextId.path(id), "utf-8");
  const preparedText = prepareMarkdown(text);
  const { code, data } = await http.post("addDoc", {
    id,
    doc: { content: preparedText },
  });
  debug("add doc:", code, data);
  if (code !== 0) {
    throw new Error(`update fulltext document failed: ${data}`);
  }
};

export const setDoc = async function ({
  text,
  schema,
  propKey,
  schemaId,
}: {
  text: string;
  schema: string;
  propKey: string;
  schemaId: number;
}): Promise<void> {
  const bft = await BFulltextId.fromSchema({ schema, propKey, schemaId });
  const id = bft.id;
  if (typeof id !== "number") {
    throw new Error(
      `BFulltextId[id] not found, ${schema} ${propKey} ${schemaId} `
    );
  }
  const filePath = bft.path;
  await fs.writeFile(filePath, text);
  const preparedText = prepareMarkdown(text);
  const { code, data } = await http.post("addDoc", {
    id,
    doc: { content: preparedText },
  });
  debug("add doc:", code, data);
  if (code !== 0) {
    throw new Error(`update fulltext document failed: ${data}`);
  }
  return;
};

export const getDoc = async ({
  schema,
  propKey,
  schemaId,
}: {
  schema: string;
  propKey: string;
  schemaId: number;
}) => {
  const repo = await BFulltextId.getRepo();
  const bft = await repo.findOne({
    where: { schema, propKey, schemaId },
  });
  if (!bft || typeof bft.id !== "number") {
    return "";
  }
  return fs.readFile(bft.path, "utf-8");
};

export type DelDocReq = {
  id: number;
};

export const removeDoc = async function ({
  schema,
  propKey,
  schemaId,
}: {
  schema: string;
  propKey: string;
  schemaId: number;
}): Promise<void> {
  const repo = await BFulltextId.getRepo();
  const bft = await repo.findOne({
    where: { schema, propKey, schemaId },
  });
  if (!bft || typeof bft.id !== "number") {
    return;
  }
  const id = bft.id as number;
  await repo.delete(bft.id);
  await fs.rm(bft.path);
  const { code, data } = await http.post("removeDoc", { id });
  debug("remove doc:", code, data);
  if (code !== 0) {
    throw new Error(`remove fulltext document failed: ${data}`);
  }
};

type DocResult = {
  id: number;
  score: number;
  text: string;
};

export const searchDoc = async function (text: string): Promise<DocResult[]> {
  const { code, data } = await http.post("searchDoc", { text });
  debug("search doc:", code, data);
  if (code !== 0) {
    throw new Error(`search fulltext document failed: ${data}`);
  }
  const res = new Array<DocResult>();
  for (const { docId, scores } of data.docs) {
    res.push({
      id: docId,
      score: scores.length > 0 ? scores[0] : 0,
      text: await fs.readFile(BFulltextId.path(docId), "utf-8"),
    });
  }
  return res;
};
