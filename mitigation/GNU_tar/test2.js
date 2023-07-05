var p;

// Successfully exploiting GNU Tar vulnerability when sandboxing
p = Deno.run({cmd: ["tar", "xvf", "input_archives/evil.tar", "-C", "output_archives", "evil_dep/"]});
await p.status();
