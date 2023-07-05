var p;

// Demonstrating that Deno works as expected after introducing further
// sandboxing capabilities
p = Deno.run({cmd: ["convert", "./input_images/w3c.svg", "./output_images/normal_output.png"]});
await p.status();

