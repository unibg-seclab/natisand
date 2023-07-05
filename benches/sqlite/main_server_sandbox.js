import { Database } from "../sqlite3/mod.ts";
import { parse } from "https://deno.land/std@0.161.0/flags/mod.ts";
import { serve } from "https://deno.land/std@0.161.0/http/server.ts";

const PORT = 5000;

const db = new Database("./northwind.sqlite");
const sql = db.prepare(`SELECT * FROM "Order"`);
const is_sandboxed = parse(Deno.args, { boolean: "sandboxed" });

const handler = async (request) => {
  return Response.json(Deno.core.ops.nativeCall(sql.all, sql, []));
};
// Run handler on incoming requests
serve(handler, { port: PORT });
