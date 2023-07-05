var p;

// Sandboxing capabilities prevent the vulnerable binary from
// including the google search logo
p = Deno.run({cmd: ["gm", "convert", "./input_images/poc_input.svg", "./output_images/nofile.jpeg"], policyId: "gm_s0"});
await p.status();
