import { Database } from "../sqlite3/mod.ts";

const db = new Database("./northwind.sqlite");

{
  const sql = db.prepare(`SELECT * FROM "Product"`);
  const size = 77;
  Deno.bench(`SELECT * FROM "Product" all - ${size} rows`, () => {
    Deno.core.ops.nativeCall(sql.all, sql, []);
  });
}
