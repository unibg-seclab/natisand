var p;

// Sandboxing capabilities prevent the vulnerable binary from creating
// the file should_not_appear.txt (the command fails correctly)
p = Deno.run({cmd: ["convert", "./input_images/policy_input.svg", "./output_images/policy_out.png"]});
await p.status();
