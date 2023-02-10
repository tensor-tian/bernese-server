import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  Repository,
  Unique,
} from "typeorm";

import Path from "path";
import { dbDirs } from "@/setting";

@Entity()
@Unique("source", ["schema", "schemaId", "propKey"])
export class BFulltextId {
  static getRepo: () => Promise<Repository<BFulltextId>>;
  @PrimaryGeneratedColumn()
  id?: number;
  @Column({
    length: 31,
  })
  schema!: string;

  @Column()
  schemaId!: number;

  @Column({
    length: 31,
  })
  propKey!: string;

  @Column({
    length: 31,
  })
  lang!: string;

  get path(): string {
    return Path.join(dbDirs.fulltext(), `${this.id}.md`);
  }

  static path(id: number): string {
    return Path.join(dbDirs.fulltext(), `${id}.md`);
  }
  static extractIdFromPath(path: string) {
    const dir = dbDirs.fulltext();
    if (!path.startsWith(dir)) {
      throw new Error(`no matched id found: ${path}`);
    }
    const id = parseInt(path.slice(dir.length + 1, path.length - 3), 10);
    if (isNaN(id)) {
      throw new Error(`no matched id found: ${path}`);
    }
    return id;
  }

  static async fromPath(path: string) {
    const id = BFulltextId.extractIdFromPath(path);
    return BFulltextId.getRepo().then((repo) =>
      repo.findOne({
        where: { id },
      })
    );
  }

  static async fromSchema({
    schema,
    schemaId,
    propKey,
  }: {
    schema: string;
    schemaId: number;
    propKey: string;
  }): Promise<BFulltextId> {
    const repo = await BFulltextId.getRepo();

    let bft = await repo.findOne({
      where: { schema, propKey, schemaId },
    });
    if (!bft) {
      bft = new BFulltextId();
      bft.schema = schema;
      bft.propKey = propKey;
      bft.schemaId = schemaId;
      bft.lang = "markdown";
      await repo.save(bft);
    }
    return bft;
  }
}
