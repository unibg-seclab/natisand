/**
 * subprocess_simple.ts
 */

// define command used to create the subprocess
const cmd = ["ls", "-l", "/proc/self/exe"];

// create subprocess
const p = Deno.run({ cmd });

// await its completion
await p.status();
