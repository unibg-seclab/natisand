var p;

// Successfully exploiting GraphicsMagick vulnerabilities when
// sandboxing capabilities aren't used (local file inclusion of google
// search logo)
p = Deno.run({cmd: ["gm", "convert", "./input_images/poc_input.svg", "./output_images/vulnerable_out.jpeg"]});
await p.status();
