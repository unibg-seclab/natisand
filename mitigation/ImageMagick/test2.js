var p;

// Successfully exploiting ImageMagick vulnerability when sandboxing
// capabilities aren't used (see creation of exploited.txt)
p = Deno.run({cmd: ["convert", "./input_images/poc_input.svg", "./output_images/vulnerable_out.png"]});
await p.status();
