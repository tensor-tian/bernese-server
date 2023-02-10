import { BWebpage } from "@/db";
import { Context } from "koa";
import { Debug } from "@/util";
import { ok } from "./util";

const debug = Debug();

export const MaxRand = parseInt("zzz", 36);

type AddWebpageReqBody = {
  url: string;
  selector: string;
  title: string;
  content: string;
};
export const addWebpage = async (ctx: Context) => {
  const bwp = await BWebpage.fromURL(ctx.request.body as AddWebpageReqBody);
  ctx.body = ok(bwp);
};

export const getWebpage = async (ctx: Context) => {
  const { url: rawURL } = ctx.request.query;
  const { host, pathname } = new URL(rawURL as string);
  const repo = await BWebpage.getRepo();
  const bwps = await repo.find({
    where: { path: `${host}${pathname}` },
    select: ["selector", "id"],
    relations: {
      markdown: true,
    },
  });
  debug("get webpage", bwps);
  ctx.body = ok(bwps);
};
