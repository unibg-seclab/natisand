import { DB } from "https://deno.land/x/sqlite@v3.4.1/mod.ts";
import { bench, run } from "https://esm.sh/mitata";

{
  Deno.bench('open database - wasm', () => {
    const db = new DB("./northwind.sqlite");
  });
}

const db = new DB("./northwind.sqlite");

{ 
  const sql = db.prepareQuery(`SELECT * FROM "Product"`);
  Deno.bench('SELECT * FROM "Product" all', () => {
    sql.all();
  });
}
