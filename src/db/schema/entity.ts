import {
  AfterInsert,
  AfterUpdate,
  BeforeRemove,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
  Repository,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import { setDoc, getDoc, removeDoc } from "../fulltext";
import { del, query, write, g } from "../graph";
import { stat } from "fs/promises";

import _ from "lodash";
import Path from "path";
import { metaMD, Debug } from "@/util";
import { BFulltextId } from "./fulltext";

const debug = Debug();

const PredicateAny = null;

type GenQuadFunc = (_: any) => NQuadObj[];
type GraphValueType = undefined | GenQuadFunc;
const _STORE = {
  graph: new Map<string, Map<string, GraphValueType>>(), // { schema: { prop: value => quads } }
  fulltext: new Map<string, Set<string>>(), // { schema: [ prop ] }
};

function Graph(valueType?: GenQuadFunc): PropertyDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return function (target: Object, propertyKey: string | symbol) {
    debug("add  %s.%s to Graph", target.constructor.name, propertyKey);
    let props = _STORE.graph.get(target.constructor.name);
    if (typeof props === "undefined") {
      props = new Map<string, GraphValueType>();
      _STORE.graph.set(target.constructor.name, props);
    }
    if (typeof propertyKey === "string") {
      props.set(propertyKey, valueType);
    }
  };
}

function Fulltext(): PropertyDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return function (target: Object, propertyKey: string | symbol) {
    debug("add %s.%s to KV", target.constructor.name, propertyKey);
    let props = _STORE.fulltext.get(target.constructor.name);
    if (typeof props === "undefined") {
      props = new Set();
      _STORE.fulltext.set(target.constructor.name, props);
    }
    if (typeof propertyKey === "string") {
      props.add(propertyKey);
    }
  };
}

type NQuadObj = { s: string; p: string; o: string; l?: string };
const objToNQuad = ({ s, p, o, l }: NQuadObj) =>
  l ? ([s, p, o, l] as Quad4) : ([s, p, o] as Quad3);

export class BEntity {
  [key: string]: unknown;
  @PrimaryGeneratedColumn()
  id?: number;

  $schema?: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt?: Date;
  @UpdateDateColumn({ name: "updated_at" })
  upadtedAt?: Date;

  @Column({
    default: 0,
  })
  cnt!: number;

  genQuads(propKey: string): NQuadObj[] {
    const v = this[propKey];
    if (v === undefined || v === null) {
      return [];
    }
    const s = this.$id;
    const valueType = _STORE.graph.get(this.constructor.name)!.get(propKey);
    if (typeof valueType === "function") {
      return valueType(v).map((v) => Object.assign(v, { s, p: propKey }));
    }
    if (Array.isArray(v)) {
      return v.map((it) => ({ s, p: propKey, o: String(it) }));
    } else if (typeof v === "object") {
      return Object.entries(v).map(([o, l]) => ({
        s,
        p: propKey,
        o: String(o),
        l: String(l),
      }));
    } else {
      return [{ s, p: propKey, o: String(v) }];
    }
  }
  get $id(): string {
    return `${this.$schema}:${this.id?.toString(36)}`;
  }
  async addTag(tag: string, category?: string) {
    if (!category) {
      await write([this.$id, "tag", tag] as Quad3, true);
    } else {
      await write([this.$id, "tag", tag, category] as Quad4, true);
    }
  }
  async removeTag(tag: string, category?: string) {
    if (!category) {
      await del([this.$id, "tag", tag] as Quad3, true);
    } else {
      await del([this.$id, "tag", tag, category] as Quad4, true);
    }
  }

  @BeforeRemove()
  async beforeRemove() {
    const fulltextProps = _STORE.fulltext.get(this.constructor.name);
    for (const prop of fulltextProps?.values() || []) {
      const { $schema, id } = this;
      if ($schema && typeof id === "number") {
        await removeDoc({
          schema: $schema,
          propKey: prop,
          schemaId: id,
        });
      }
    }
    const quads = await this.listOut(true).then((quads) =>
      quads.map(objToNQuad)
    );
    return del(quads).catch(debug);
  }

  @AfterInsert()
  async afterInsert() {
    debug("after insert", this.constructor.name);
    const fulltextProps = _STORE.fulltext.get(this.constructor.name);
    for (const prop of fulltextProps?.keys() || []) {
      const { $schema, id } = this;
      const text = this[prop];
      if ($schema && typeof id === "number" && typeof text == "string") {
        await setDoc({
          text,
          schema: $schema,
          propKey: prop,
          schemaId: id,
        });
      }
    }

    const props = _STORE.graph.get(this.constructor.name);
    const toWrite: (Quad3 | Quad4)[] = [];
    for (const prop of props?.keys() || []) {
      const quads = this.genQuads(prop);
      toWrite.push(...quads.map(objToNQuad));
    }
    if (toWrite.length > 0) {
      await write(toWrite).catch(debug);
    }
  }

  @AfterUpdate()
  async afterUpdate(...props: string[]) {
    debug("after update", this.constructor.name);

    const fulltextProps = _STORE.fulltext.get(this.constructor.name);
    for (const prop of fulltextProps?.keys() || []) {
      if (this[prop]) {
        if (props.length > 0 && !props.includes(prop)) continue;
        const { $schema, id } = this;
        const text = this[prop];
        if ($schema && typeof id === "number" && typeof text == "string") {
          await setDoc({
            text,
            schema: $schema,
            propKey: prop,
            schemaId: id,
          });
        }
      }
    }

    const graphProps = _STORE.graph.get(this.constructor.name);
    const outQuads = _.groupBy(await this.listOut(true), (quads) => quads.p);

    const toWrite: (Quad3 | Quad4)[] = [];
    const toDel: (Quad3 | Quad4)[] = [];
    for (const prop of graphProps?.keys() || []) {
      debug("prop:", prop, props);
      if (props.length > 0 && !props.includes(prop)) continue;
      const newQuads = this.genQuads(prop);
      const oldQuads = outQuads[prop] || [];
      debug("prop:", prop, newQuads, oldQuads);
      toWrite.push(
        ..._.differenceWith(
          newQuads,
          oldQuads,
          (a, b) => a.o === b.o && a.l === b.l
        ).map(objToNQuad)
      );
      toDel.push(
        ..._.differenceWith(
          oldQuads,
          newQuads,
          (a, b) => a.o === b.o && a.l === b.l
        ).map(objToNQuad)
      );
    }
    debug("to write:", toWrite, "\n", "to delete:", toDel);
    if (toWrite.length > 0) {
      await write(toWrite).catch(debug);
    }
    if (toDel.length > 0) {
      await del(toDel).catch(debug);
    }
  }

  async listOut(includeLabel = false, predicate?: string): Promise<NQuadObj[]> {
    g.V(this.$id)
      .tag("s")
      .labelContext(null)
      .out(predicate || PredicateAny, "p")
      .tag("o")
      .all();

    const quads = await query<NQuadObj[]>(g.code(), { unique: false });

    if (includeLabel) {
      let filter = (_: any) => true;
      if (predicate) {
        filter = (item: any) => item.p === predicate;
      }
      g.V(this.$id)
        .tag("s")
        .labelContext(g.V(this.$id).labels(), "l")
        .out(PredicateAny, "p")
        .tag("o")
        .all();
      const quads4 = await query<NQuadObj[]>(g.code(), {
        unique: false,
        filter,
      });
      quads4.forEach((qd4) => {
        const found = quads.find((qd3) => qd3.o == qd4.o && !qd3.l);
        if (found && qd4.l) found.l = qd4.l;
      });
    }
    return quads;
  }

  async listIn(includeLabel = false, predicate?: string): Promise<NQuadObj[]> {
    g.V(this.$id)
      .tag("s")
      .labelContext(null, "l")
      .in(predicate || PredicateAny, "p")
      .tag("o")
      .all();
    const quads = await query<NQuadObj[]>(g.code(), {
      unique: false,
    });

    if (includeLabel) {
      let filter = (_: any) => true;
      if (predicate) {
        filter = (item: any) => item.p === predicate;
      }
      g.V(this.$id)
        .tag("s")
        .labelContext(g.V(this.$id).labels(), "l")
        .in(PredicateAny, "p")
        .tag("o")
        .all();
      const quads4 = await query<NQuadObj[]>(g.code(), {
        unique: false,
        filter,
      });
      quads4.forEach((qd4) => {
        const found = quads.find((qd3) => qd3.o === qd4.o && !qd3.l);
        if (found && qd4.l) found.l = qd4.l;
      });
    }
    return quads;
  }
}

@Entity()
export class BFile extends BEntity {
  static getRepo: () => Promise<Repository<BFile>>;
  override $schema = "BFile";

  static async fromPath(filePath: string) {
    const repo = await BFile.getRepo();
    let f = await repo.findOne({
      where: {
        path: filePath,
      },
    });
    if (f && typeof f.id === "number") {
      repo
        .update(f.id, {
          cnt: f.cnt + 1,
        })
        .catch(debug);
      return f;
    }
    f = new BFile();
    const st = await stat(filePath);
    const { name, ext } = Path.parse(filePath);
    f.path = filePath;
    f.name = name;
    f.size = st.size;
    f.createdAt = new Date(Math.round(st.birthtimeMs));

    if (ext.length === 0) {
      f.format = await BFormat.fromExt("", "binary");
    } else if (filePath.endsWith(".d.ts")) {
      f.format = await BFormat.fromExt(".d.ts", "dts");
    } else {
      f.format = await BFormat.fromExt(ext);
    }
    f.cnt = 1;
    await repo.save(f);
    return f;
  }

  @Graph()
  @Index()
  @Column({ length: 256, unique: true })
  path!: string;

  @Graph()
  @Column({ length: 32 })
  name!: string;

  @Column({ type: "int", default: 0, unsigned: true })
  size!: number;

  @Graph((format: BFormat) => [
    { p: "format", o: format.extension } as NQuadObj,
  ])
  @ManyToOne(() => BFormat, (format) => format.files)
  format?: Relation<BFormat>;

  @Graph()
  @ManyToMany(() => BFormat, (format) => format.openBy)
  @JoinTable()
  open?: Relation<BFormat>[];

  @OneToMany(() => BNote, (note) => note.sourceFile)
  @JoinTable()
  notes?: Relation<BNote>[];
}

@Entity()
export class BDir extends BEntity {
  static getRepo: () => Promise<Repository<BDir>>;
  override $schema = "BDir";

  static async fromPath(dirPath: string) {
    const repo = await BDir.getRepo();
    let dir = await repo.findOne({ where: { path: dirPath } });
    if (dir && dir.id) {
      repo.update(dir.id, { cnt: dir.cnt + 1 }).catch(debug);
      return dir;
    }
    dir = new BDir();
    dir.path = dirPath;
    dir.name = Path.basename(dirPath);
    dir.size = 0;
    dir.cnt = 1;
    await repo.save(dir);
    return dir;
  }

  @Graph()
  @Index()
  @Column({ length: 256, unique: true })
  path!: string;

  @Graph()
  @Column({ length: 32 })
  name!: string;

  @Graph()
  @Column({ length: 16, nullable: true })
  alias!: string;

  @Column({ type: "int", default: 0, unsigned: true })
  size!: number;
}

@Entity()
export class BFormat extends BEntity {
  static getRepo: () => Promise<Repository<BFormat>>;
  override $schema = "BFormat";

  static async fromExt(ext: string, name?: string): Promise<BFormat> {
    const repo = await BFormat.getRepo();
    let fmt = await repo.findOne({
      where: {
        extension: ext,
      },
    });
    if (fmt && fmt.id) {
      repo
        .update(fmt.id, {
          cnt: fmt.cnt + 1,
        })
        .catch(debug);
      return fmt;
    }
    fmt = new BFormat();
    fmt.extension = ext;
    fmt.name = name ? name : ext.startsWith(".") ? ext.slice(1) : ext;
    fmt.description = "auto generate";
    fmt.cnt = 1;
    await repo.save(fmt);
    return fmt;
  }

  @Column({ length: 16, unique: true })
  extension!: string;

  @Graph()
  @Column({ length: 30, unique: true })
  name!: string;

  @Column({ length: 100 })
  description!: string;

  @Graph()
  @OneToMany(() => BFile, (file) => file.format)
  files!: BFile[];

  @Graph()
  @ManyToMany(() => BFile, (file) => file.open)
  openBy!: BFile[];
}

@Entity()
export class BFn extends BEntity {
  static getRepo: () => Promise<Repository<BFn>>;
  override $schema = "BFn";

  @Column({
    length: 30,
    unique: true,
  })
  name!: string;

  @Column({
    length: 20,
  })
  lang!: string;

  @Fulltext()
  code?: string;

  async prepareCode() {
    if (!this.code) {
      const { $schema, id } = this;
      if ($schema && typeof id === "string") {
        this.code = await getDoc({
          schema: $schema,
          propKey: "code",
          schemaId: id,
        });
      }
    }
  }
  @Graph()
  deps!: Record<string, string>;

  async prepareDeps() {
    if (this.deps) return;
    g.V(this.$id)
      .labelContext(g.V(this.$id).labels(), "l")
      .out(null, "p")
      .tag("s")
      .all();
    this.deps = await query<NQuadObj[]>(g.code(), {
      filter: (item: NQuadObj) => item.p === "deps",
    }).then((items) =>
      items.reduce((prev, cur) => {
        prev[cur.s] = cur.l!;
        return prev;
      }, {} as Record<string, string>)
    );
  }

  static async fromName(name: string, lang = "javascript") {
    const repo = await BFn.getRepo();
    let fn = await repo.findOne({ where: { name } });
    if (fn) {
      await Promise.all([fn.prepareCode(), fn.prepareDeps()]);
      return fn;
    }
    fn = new BFn();
    fn.lang = lang;
    fn.name = name;
    fn.code = "";
    fn.deps = {};
    await repo.save(fn);
    return fn;
  }
}

@Entity()
@Unique("location", ["sourceFile", "startLine", "endLine"])
export class BNote extends BEntity {
  static getRepo: () => Promise<Repository<BNote>>;
  override $schema = "BNote";

  @Column({
    length: 20,
  })
  lang!: string;

  @Graph((file: BFile) => [{ o: file.$id } as NQuadObj])
  @ManyToOne(() => BFile, (file) => file.notes, { nullable: false })
  sourceFile!: BFile;

  @Column({
    type: "int",
  })
  startLine!: number;
  @Column({
    type: "int",
  })
  endLine!: number;

  @Fulltext()
  content?: string;

  async fulltextId() {
    const id = this.id;
    if (typeof id !== "number") {
      throw new Error("get id before note saved");
    }
    return BFulltextId.fromSchema({
      schema: this.$schema,
      schemaId: id,
      propKey: "content",
    });
  }

  static async fromSource(file: BFile, startLine: number, endLine: number) {
    const repo = await BNote.getRepo();
    let note: BNote | null = null;
    if (typeof file?.id === "number") {
      note = await repo.findOne({
        where: { sourceFile: { id: file.id }, startLine, endLine },
      });
    }
    if (!note) {
      note = new BNote();
      note.lang = "markdown";
      note.sourceFile = file;
      note.startLine = startLine;
      note.endLine = endLine;
      await repo.save(note);
    }
    return note;
  }

  async writeContent(content: string) {
    this.content = content;
    this.afterUpdate("content");
  }

  static async fromContentPath(path: string) {
    const bft = await BFulltextId.fromPath(path);
    if (!bft) {
      throw new Error("Fulltext id not found: " + path);
    }
    if (bft.schema !== "BFNote") {
      throw new Error("Fulltext content is not Note: " + path);
    }
    return BNote.getRepo().then((repo) =>
      repo.findOne({ where: { id: bft.schemaId } })
    );
  }
}

@Unique("location", ["path", "selector"])
@Entity()
export class BWebpage extends BEntity {
  static getRepo: () => Promise<Repository<BWebpage>>;
  override $schema = "BWebpage";

  @Graph()
  @Column({
    length: 128,
    comment: "hostname + pathname",
  })
  path!: string;
  @Column({
    length: 128,
  })
  selector!: string;

  @Graph()
  host?: string;

  @Column({
    length: 256,
  })
  url!: string;

  @Column({
    length: 256,
  })
  title!: string;

  @Fulltext()
  content?: string;

  public setMarkdown(content: string) {
    this.content = metaMD.dump(
      {
        path: this.path,
        url: this.url,
        selector: this.selector,
        type: "webpage",
        webpageId: this.id,
        title: this.title,
      },
      content
    );
  }
  static async fromURL({
    url,
    selector,
    title,
    content,
  }: {
    url: string;
    selector: string;
    title: string;
    content: string;
  }) {
    const { pathname, host } = new URL(url);
    const path = host + pathname;
    const repo = await BWebpage.getRepo();
    let wp = await repo.findOne({
      where: { path, selector },
    });
    debug("from URL, find webpage: ", wp);
    if (wp) {
      wp.setMarkdown(content);
    } else {
      if (!wp) {
        wp = new BWebpage();
        wp.path = path;
        wp.selector = selector;
        wp.url = url;
        wp.host = host;
        wp.title = title;
        await repo.save(wp);
        debug("wp after save %O", wp);
        wp.setMarkdown(content);
      }
      await wp.afterUpdate("content");
    }
    return wp;
  }
}
