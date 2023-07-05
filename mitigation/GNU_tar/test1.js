var p;

// Demonstrating that Deno works as expected after introducing further
// sandboxing capabilities
p = Deno.run({cmd: ["tar", "xvf", "input_archives/legitimate.tar", "-C", "output_archives", "legitimate_dep/"]});
await p.status();
