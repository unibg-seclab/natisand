/**
 * subprocess_simple.ts
 */

// define command used to create the subprocess
const cmd = ["sleep", "1000"];

// create subprocess
const p = Deno.run({ cmd });

// await its completion
await p.status();
