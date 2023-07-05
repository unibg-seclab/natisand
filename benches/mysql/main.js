import { Connection } from "../mysql-native/mod.ts";
const db = new Connection();

db.connect({
  host: "127.0.0.1",
  user: "trial",
  password: "pwd",
  database: "test",
});

db.execute(`CREATE TABLE IF NOT EXISTS test ( id INT, name VARCHAR(255) )`);

try {
  db.execute(`TRUNCATE TABLE test`);
} catch {}

const x = db.query(`SELECT * FROM test`).all();
if (x.length !== 0) throw new Error("Table is not empty");

Deno.bench("select", () => {
  db.query(`SELECT * FROM test`).all();
});
Deno.bench("insert", () => {
  db.execute(`INSERT INTO test VALUES (1, "test")`);
});
Deno.bench("select - full", () => {
  db.query(`SELECT * FROM test`).all();
});

