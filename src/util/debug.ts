import DebugPkg from "debug";

export function Debug() {
  const originalFunc = Error.prepareStackTrace;

  let callerfile: string;
  try {
    const err = new Error();

    Error.prepareStackTrace = function (_, stack) {
      return stack;
    };

    const stack = err.stack as unknown as any[];
    const currentfile = stack.shift().getFileName() as string;

    while (stack.length) {
      callerfile = stack.shift().getFileName();

      if (currentfile !== callerfile) break;
    }
  } catch (e) {}
  Error.prepareStackTrace = originalFunc;
  const srcIdx = callerfile!.indexOf("/src/");
  return DebugPkg(`b:${callerfile!.slice(srcIdx + 5).replace("/", ":")}`);
}
