import { Debug } from "@/util";
import cp from "child_process";
import { dirs } from "@/setting";
import util from "util";

const exec = util.promisify(cp.exec);
const debug = Debug();
export const cmdOptions = {
  cwd: dirs.bernese,
  shell: "/bin/bash",
  timeout: 10 * 1000,
} as Partial<cp.ExecSyncOptionsWithStringEncoding>;

/*
  const result = await execPromise(BIN, code);
  if (result.stdout) {
    return result.stdout;
  } else if (result.stderr) {
    return Promise.reject(result.stderr);
  } else {
    return Promise.reject("no output");
  }
*/
export const execPromise = async (
  command: string,
  options: cp.ExecOptionsWithStringEncoding = { encoding: "utf8" }
) => {
  const promise = exec(command, { ...cmdOptions, ...options });
  promise.child.on("data", (data) => {
    debug("stdout", data);
  });
  promise.child.on("data", (data) => {
    debug("stderr:", data);
  });
  promise.child.on("close", (...args) => debug("close:", ...args));
  return promise;
};
