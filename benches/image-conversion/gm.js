Deno.run({cmd: ["gm", "convert", "input.mpc", "output.mpc"]});

Deno.bench('Native - GraphicsMagick - convert image (1:1)', async () => {
    let p = Deno.run({cmd: ["gm", "convert", "input.mpc", "output.mpc"]});
    await p.status();
});

Deno.bench('Native - GraphicsMagick - convert image (enhance)', async () => {
    let p = Deno.run({cmd: ["gm", "convert", "input.mpc", "-enhance", "output.mpc"]});
    await p.status();
});

Deno.bench('Native - GraphicsMagick - convert image (resize)', async () => {
    let p = Deno.run({cmd: ["gm", "convert", "input.mpc", "-resize", "50%", "output.mpc"]});
    await p.status();
});

Deno.bench('Native - GraphicsMagick - convert image (rotate)', async () => {
    let p = Deno.run({cmd: ["gm", "convert", "input.mpc", "-rotate", "90", "output.mpc"]});
    await p.status();
});

Deno.bench('Native - GraphicsMagick - convert image (sharpen)', async () => {
    let p = Deno.run({cmd: ["gm", "convert", "input.mpc", "-sharpen", "0x2.0", "output.mpc"]});
    await p.status();
});

Deno.bench('Native - GraphicsMagick - convert image (swirl)', async () => {
    let p = Deno.run({cmd: ["gm", "convert", "input.mpc", "-swirl", "90", "output.mpc"]});
    await p.status();
});
