import { Debug } from "@/util";
import initAPI from "@/api";
import { initDB } from "@/db";

const debug = Debug();
debug("bernese server is starting");

initDB();
initAPI();

setInterval(() => {
  debug("bernese server is running");
}, 60000);
