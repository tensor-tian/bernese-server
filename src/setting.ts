import Path from "path";

const home = process.env["HOME"] as string;
const berneseRoot = Path.join(home, ".bernese");

export const dirs = {
  projectRoot: Path.dirname(Path.dirname(require.main!.filename)),
  home,
  bernese: berneseRoot,
  db: Path.join(berneseRoot, "db"),
  resource: Path.join(berneseRoot, "resources"),
  md: Path.join(berneseRoot, "bernese-md"),
  users: Path.join(berneseRoot, "users"),
};

export const graph = {
  baseURL: "",
  port: 64210,
  prefix: "api/v2",
};

export const baseURL = {
  graph: "http://127.0.0.1:64210/api/v2",
  fulltext: "http://127.0.0.1:64211",
};

const username = Symbol("username");

export const dbDirs = {
  [username]: "default",
  fulltext: function () {
    return Path.join(dirs.users, this[username], "fulltext");
  },
  graph: function () {
    return Path.join(dirs.users, this[username], "graph");
  },
  schema: function () {
    return Path.join(dirs.users, this[username], "schema");
  },
  setUser: function (ns: string) {
    this[username] = ns;
  },
};

export const env = {
  isPackaged: true,
};

export type Settings = {
  dirs: typeof dirs;
  graph: typeof graph;
  env: typeof env;
};
//
