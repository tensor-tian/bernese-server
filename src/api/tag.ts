import { BDir, BFile, g, query } from "@/db";

import { Context } from "koa";
import { Debug } from "@/util";
import { ok } from "./util";
import { stat } from "fs/promises";

const debug = Debug();

/**
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{ "path":"/Users/jinmao/www/project/bernese/src/main/db/entity.ts","tag":"orm"}' \
  http://localhost:4189/api/tag
 */
export const addTag = async (ctx: Context) => {
  const { path, tag, category } = ctx.request.body;
  for (const p of typeof path === "string" ? [path] : path) {
    if (!p.startsWith("/")) {
      const msg = `invalid resource: ${p}`;
      debug(msg);
      ctx.throw(400, msg);
    }
    const st = await stat(p);
    if (st.isDirectory()) {
      const dir = await BDir.fromPath(p);
      await dir.addTag(tag, category);
    } else if (st.isFile()) {
      const file = await BFile.fromPath(p);
      await file.addTag(tag, category);
    } else {
      ctx.throw(400, `unknown resource: ${p}`);
    }
  }
  ctx.body = ok();
};

export const getTagsByCategory = async (ctx: Context) => {
  const { category } = ctx.request.query;
  g.V().tag("tag").labelContext(category).in("tag").back("tag").unique().all();
  const tags = await query(g.code(), { mapper: ({ tag }) => tag });
  debug("tag list by category %s: %O", category, tags);

  ctx.body = ok(tags);
};
