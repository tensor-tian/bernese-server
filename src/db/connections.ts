import { BDir, BFile, BFn, BFormat, BFulltextId, BNote, BWebpage } from "@/db";
import { dbDirs, dirs } from "@/setting";

import { DataSource } from "typeorm";
import Debug from "debug";
import Path from "path";
import fs from "fs";
import pm2 from "pm2";
import { promisify } from "@/util";
import yaml from "js-yaml";

const debug = Debug("b:db");
const connect = promisify<boolean>(pm2.connect.bind(pm2));
const listProc = promisify(pm2.list.bind(pm2));
const startProc = promisify<pm2.StartOptions, pm2.Proc>(pm2.start.bind(pm2));
const stopProc = promisify(pm2.stop.bind(pm2));
const disconnect = promisify(pm2.disconnect.bind(pm2));

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: "0777" });
  }
}

const configCayley = async () => {
  const dataDir = Path.join(dbDirs.graph(), "data");
  ensureDir(dataDir);
  debug("calay dir:", dataDir);
  const config = {
    store: {
      backend: "leveldb",
      address: dataDir,
      read_only: false,
      options: {
        nosync: false,
      },
      query: {
        timeout: "30s",
      },
      load: {
        ignore_duplicates: false,
        ignore_missing: false,
        batch: 10000,
      },
    },
  };
  const content = yaml.dump(config);
  fs.writeFileSync(Path.join(dbDirs.graph(), "cayley.yml"), content);
  // const needInit = !fs
  //   .readdirSync(dataDir, { encoding: "utf-8", withFileTypes: false })
  //   .some((file) => !file.startsWith("."));
  // if (needInit) {
  //   const result = await execPromise("cayley -c ./cayley.yml --init", {
  //     cwd: dbDirs.graph(),
  //     encoding: "utf-8",
  //   });
  //   debug("init cayley done: %s ", result);
  // }
};

const configWukong = () => {
  ensureDir(Path.join(dbDirs.fulltext(), "data"));
  const dest = Path.join(dbDirs.fulltext(), "dictionary.txt");
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(Path.join(dirs.projectRoot, "data/dictionary.txt"), dest);
  }
};

const entities = [BDir, BFile, BFn, BFormat, BFulltextId, BNote, BWebpage];
type EntityType = typeof entities extends Iterable<infer T> ? T : never;

const state: {
  running: boolean;
  schemaDB: DataSource | null;
} = {
  running: false,
  schemaDB: null,
};

const apps: Record<"graph" | "fulltext", () => pm2.StartOptions> = {
  graph: () => ({
    name: "graph",
    script: "cayley",
    args: ["http", "-c", "./cayley.yml", "--init"],
    autorestart: false,
    cwd: dbDirs.graph(),
  }),
  fulltext: () => ({
    name: "wukong",
    script: "wukong",
    args: ["-dir", "./data", "-dict", "./dictionary.txt"],
    autorestart: false,
    cwd: dbDirs.fulltext(),
  }),
};

function _getRepo(cls: EntityType) {
  return async () => {
    while (!state.running) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    return state.schemaDB!.getRepository(cls);
  };
}

export async function getRepo(cls: EntityType) {
  return _getRepo(cls);
}

export async function resetUser(username: string) {
  debug("will set namespace to: %s", username);
  state.running = false;

  try {
    dbDirs.setUser(username);

    await state.schemaDB?.destroy();
    const schemaDataDir = dbDirs.schema();
    ensureDir(schemaDataDir);
    debug("schema data dir:", schemaDataDir);
    state.schemaDB = new DataSource({
      type: "sqlite",
      database: Path.join(schemaDataDir, "sqlite.db"),
      synchronize: true,
      logging: true,
      entities,
      migrations: [],
      subscribers: [],
    });
    await state.schemaDB.initialize();
    entities.forEach((cls) => {
      cls.getRepo = _getRepo(cls);
    });
    await connect(true);
    const procList = await listProc();
    for (const proc of procList) {
      const { name } = proc;
      if (!name || !(name in apps)) {
        continue;
      }
      debug("stop proc: %s", name);
      await stopProc(name);
    }
    configCayley();
    const graphConfig = apps.graph();
    debug("graph db config: %O:", graphConfig);
    const proc1 = await startProc(graphConfig);
    debug("start graph DB:\n%O", proc1);

    configWukong();
    const fulltextConfig = apps.fulltext();
    debug("fulltext db config: %O", fulltextConfig);
    const proc2 = await startProc(fulltextConfig);
    debug("start fulltext DB:\n%O", proc2);
  } catch (err) {
    debug("reset user workspace error: ", err);
    process.exit(1);
  } finally {
    disconnect();
  }
  state.running = true;
}

export function init() {
  resetUser("default");
}
