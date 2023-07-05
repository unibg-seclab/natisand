import { Database } from "../sqlite3/mod.ts";

{
  Deno.bench("open database", () => {
    const db = new Database("./northwind.sqlite");
  });
}

const db = new Database("./northwind.sqlite");


{
  const sql = db.prepare(`SELECT * FROM "Product"`);
  const size = 77;
  Deno.bench(`SELECT * FROM "Product" all - ${size} rows`, () => {
    sql.all();
  });
}

