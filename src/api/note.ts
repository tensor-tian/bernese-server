import { BFile, BFulltextId, BNote, updateFulltextDoc } from "@/db";
import { Debug, metaMD } from "@/util";

import { Context } from "koa";
import { HttpStatusCode } from "axios";
import { ok } from "./util";

const debug = Debug();

type CodeLocation = {
  path: string;
  startLine: number; // 0 based number
  endLine: number; // 0 based number
};
export const createNote = async (ctx: Context) => {
  const { content } = ctx.request.body as { content: string };
  const { metadata, markdown } = metaMD.parse<CodeLocation>(content);
  if (!metadata) {
    ctx.throw("no metadata found");
  }
  const { path: filePath, startLine, endLine } = metadata;
  const sourceFile = await BFile.fromPath(filePath);
  const note = await BNote.fromSource(sourceFile, startLine, endLine);
  note.content = metaMD.dump(
    {
      ...metadata,
      schema: note.$schema,
      schemaId: note.id!,
      propKey: "content",
    },
    markdown
  );
  // force write note content
  await note.afterUpdate("content");
  debug("", note);
  const bft = await note.fulltextId();
  ctx.body = ok({
    path: bft.path,
  });
};

type UpdateNoteReqBody = { path: string };

export const updateNote = async (ctx: Context) => {
  try {
    const { path: notePath } = ctx.request.body as UpdateNoteReqBody;
    const id = BFulltextId.extractIdFromPath(notePath);
    await updateFulltextDoc(id);
    ctx.body = ok();
  } catch (err: any) {
    ctx.throw(err.message, HttpStatusCode.InternalServerError);
  }
};

export const getNotesBySourceFile = async (ctx: Context) => {
  const { path } = ctx.request.query;

  const notes = await BNote.getRepo().then((repo) =>
    repo
      .createQueryBuilder("note")
      .select(["note.id", "note.startLine", "note.endLine"])
      .leftJoin("note.sourceFile", "file")
      .where({ sourceFile: { path: path } })
      .getMany()
  );
  for (const note of notes) {
    const bft = await BFulltextId.fromSchema({
      schema: "BNote",
      schemaId: note.id!,
      propKey: "content",
    });
    note["path"] = bft.path;
  }
  debug("get notes by source file: ", notes);

  ctx.body = ok(notes);
};
