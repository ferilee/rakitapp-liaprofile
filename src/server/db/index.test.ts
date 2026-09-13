import { afterEach, describe, expect, test } from "bun:test";
import { createDatabase, ensureSchema, seedDatabase, seedResourceSubmenus } from "./index";

const databases: ReturnType<typeof createDatabase>[] = [];

function newDatabase() {
  const database = createDatabase(":memory:");
  databases.push(database);
  return database;
}

afterEach(() => {
  while (databases.length) databases.pop()?.sqlite.close();
});

describe("database setup", () => {
  test("creates the complete schema and is safe to run repeatedly", () => {
    const database = newDatabase();

    ensureSchema(database.sqlite);
    ensureSchema(database.sqlite);

    const tables = database.sqlite.query("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as { name: string }[];
    const columns = database.sqlite.query("PRAGMA table_info(resources)").all() as { name: string }[];

    expect(tables.map((table) => table.name)).toEqual(["physics_facts", "profiles", "resources", "social_links", "sqlite_sequence", "works"]);
    expect(columns.some((column) => column.name === "parent_id")).toBe(true);
  });

  test("seeds the base site data only once", () => {
    const database = newDatabase();
    ensureSchema(database.sqlite);

    seedDatabase(database.sqlite);
    seedDatabase(database.sqlite);

    expect(database.sqlite.query("SELECT COUNT(*) AS count FROM profiles").get()).toEqual({ count: 1 });
    expect(database.sqlite.query("SELECT COUNT(*) AS count FROM resources").get()).toEqual({ count: 6 });
    expect(database.sqlite.query("SELECT COUNT(*) AS count FROM works").get()).toEqual({ count: 3 });
    expect(database.sqlite.query("SELECT COUNT(*) AS count FROM social_links").get()).toEqual({ count: 4 });
    expect(database.sqlite.query("SELECT COUNT(*) AS count FROM physics_facts").get()).toEqual({ count: 3 });
  });

  test("seeds all nested resource menus only once", () => {
    const database = newDatabase();
    ensureSchema(database.sqlite);
    seedDatabase(database.sqlite);

    seedResourceSubmenus(database.sqlite);
    seedResourceSubmenus(database.sqlite);

    expect(database.sqlite.query("SELECT COUNT(*) AS count FROM resources WHERE parent_id IS NOT NULL").get()).toEqual({ count: 19 });
    expect(database.sqlite.query("SELECT COUNT(DISTINCT parent_id) AS count FROM resources WHERE parent_id IS NOT NULL").get()).toEqual({ count: 6 });
  });
});
