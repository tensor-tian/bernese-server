import { IGraph } from "gizmo";
import { fnBodyString } from "./graph";

const arrowFn = (g: IGraph) => {
  g.V().all();
  g.V("a", "b")
    .out(null, "p")
    .filter(/(\\+)/)
    .forEach(function (item) {
      g.emit(item["id"]);
    });
  g.emit("ok");
};
function fn(g: IGraph) {
  g.V().all();
  g.V("a", "b")
    .out(null, "p")
    .filter(/(\\+)/)
    .forEach(function (item) {
      g.emit(item["id"]);
    });
  g.emit("ok");
}
const anonymousFn = function (g: IGraph) {
  g.V().all();
  g.V("a", "b")
    .out(null, "p")
    .filter(/(\\+)/)
    .forEach(function (item) {
      g.emit(item["id"]);
    });
  g.emit("ok");
};

const expected = [
  "g.V().all();",
  'g.V("a", "b")',
  '.out(null, "p")',
  ".filter(" + String(/(\\+)/) + ")",
  ".forEach(function (item) {",
  'g.emit(item["id"]);',
  "});",
  'g.emit("ok");',
];

test("gen func", () => {
  fnBodyString(arrowFn)
    .split("\n")
    .forEach((row, i, rows) => {
      expect(rows.length).toBe(expected.length);
      expect(row.trim()).toBe(expected[i]);
    });
  fnBodyString((g: IGraph) => {
    g.V().all();
    g.V("a", "b")
      .out(null, "p")
      .filter(/(\\+)/)
      .forEach(function (item) {
        g.emit(item["id"]);
      });
    g.emit("ok");
  });
  fnBodyString(fn)
    .split("\n")
    .forEach((row, i, rows) => {
      expect(rows.length).toBe(expected.length);
      expect(row.trim()).toBe(expected[i]);
    });
  fnBodyString(function fn(g: IGraph) {
    g.V().all();
    g.V("a", "b")
      .out(null, "p")
      .filter(/(\\+)/)
      .forEach(function (item) {
        g.emit(item["id"]);
      });
    g.emit("ok");
  })
    .split("\n")
    .forEach((row, i, rows) => {
      expect(rows.length).toBe(expected.length);
      expect(row.trim()).toBe(expected[i]);
    });
  fnBodyString(anonymousFn)
    .split("\n")
    .forEach((row, i, rows) => {
      expect(rows.length).toBe(expected.length);
      expect(row.trim()).toBe(expected[i]);
    });
  fnBodyString(function (g: IGraph) {
    g.V().all();
    g.V("a", "b")
      .out(null, "p")
      .filter(/(\\+)/)
      .forEach(function (item) {
        g.emit(item["id"]);
      });
    g.emit("ok");
  })
    .split("\n")
    .forEach((row, i, rows) => {
      expect(rows.length).toBe(expected.length);
      expect(row.trim()).toBe(expected[i]);
    });
  expect(fnBodyString((g: IGraph) => g.V().all())).toBe("g.V().all()");
});
