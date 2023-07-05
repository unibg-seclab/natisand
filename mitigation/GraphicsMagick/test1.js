var p;

// Demonstrating that Deno works as expected after introducing further
// sandboxing capabilities
p = Deno.run({cmd: ["gm", "convert", "./input_images/w3c.svg", "./output_images/normal_output.jpeg"], policyId: "gm_s0"});
await p.status();
