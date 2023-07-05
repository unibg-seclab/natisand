var p;

// Sandboxing capabilities prevent the vulnerable binary from compromising
// the file target_file.txt (the command fails correctly)
p = Deno.run({cmd: ["tar", "xvf", "input_archives/evil.tar", "-C", "output_archives", "evil_dep/"]});
await p.status();
