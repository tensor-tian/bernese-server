import { Schema, connect, model } from "mongoose";
import {
  enablePatches,
  immerable,
  produceWithPatches,
  setAutoFreeze,
} from "immer";

import Debug from "debug";
import type { Mongoose } from "mongoose";

setAutoFreeze(false);
enablePatches();
const debug = Debug("b:demo:mongo");

interface IUser {
  name: string;
  email: string;
  avatar?: string;
  tags: string[];
  likes: {
    [key in string]: boolean;
  };
}

const userSchema = new Schema<IUser>({
  name: "string",
  email: { type: String, required: true },
  tags: { type: [String], required: true },
  avatar: String,
  likes: { type: Map, of: String, required: true },
});

const User = model<IUser>("User", userSchema);
// @ts-ignore
User[immerable] = true;

let db: Mongoose | undefined;
async function run() {
  db = await connect(
    "mongodb://jinmao:vtu123456@0.0.0.0:27017/bernese-demo?authSource=admin"
  );

  const user = new User({
    name: "Bill",
    email: "bill@inittech.com",
    avatar: "https://i.imgur.com/dM7Thhn.png",
    // tags: [],
    likes: {
      javascript: true,
    },
  });
  await user.save();

  const [user2, patches, inversePatches] = produceWithPatches(user, (draft) => {
    draft.name = "Bell";
    draft.likes["javascript"] = false;
    draft.tags.push("bear");
    draft.tags.unshift("dog");
  });

  debug(
    "user2 !== user: %s, user2 instance of User: %s",
    user2 !== user,
    user2 instanceof User
  );

  await user2.save();
  debug("user: %O\n user2: %O", user, user2, patches, inversePatches);
}

run()
  .catch(debug)
  .then(() => {
    if (db) {
      db.disconnect();
    }
  });
