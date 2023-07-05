import {
  ImageMagick,
  initializeImageMagick,
} from "https://deno.land/x/imagemagick_deno/mod.ts";

await initializeImageMagick();

Deno.run({cmd: ["convert", "input.mpc", "output.mpc"]});

Deno.bench('Native - ImageMagick - convert image (1:1)', async () => {
    let p = Deno.run({cmd: ["convert", "input.mpc", "output.mpc"]});
    await p.status();
});

Deno.bench('Native - ImageMagick - convert image (enhance)', async () => {
    let p = Deno.run({cmd: ["convert", "input.mpc", "-enhance", "output.mpc"]});
    await p.status();
});

Deno.bench('Native - ImageMagick - convert image (resize)', async () => {
    let p = Deno.run({cmd: ["convert", "input.mpc", "-resize", "50%", "output.mpc"]});
    await p.status();
});

Deno.bench('Native - ImageMagick - convert image (rotate)', async () => {
    let p = Deno.run({cmd: ["convert", "input.mpc", "-rotate", "90", "output.mpc"]});
    await p.status();
});

Deno.bench('Native - ImageMagick - convert image (sharpen)', async () => {
    let p = Deno.run({cmd: ["convert", "input.mpc", "-sharpen", "0x2.0", "output.mpc"]});
    await p.status();
});

Deno.bench('Native - ImageMagick - convert image (swirl)', async () => {
    let p = Deno.run({cmd: ["convert", "input.mpc", "-swirl", "90", "output.mpc"]});
    await p.status();
});

Deno.bench('WASM - ImageMagick - convert image (1:1)', async () => {
    const data = await Deno.readFile("input.mpc");
    ImageMagick.read(data, img => {
        img.write(data => Deno.writeFile("output.mpc", data));
    });
});

Deno.bench('WASM - ImageMagick - convert image (resize)', async () => {
    const data = await Deno.readFile("input.mpc");
    ImageMagick.read(data, img => {
        img.resize(3000,6000);
        img.write(data => Deno.writeFile("output.mpc", data));
    });
});

Deno.bench('WASM - ImageMagick - convert image (rotate', async () => {
    const data = await Deno.readFile("input.mpc");
    ImageMagick.read(data, img => {
        img.rotate(90);
        img.write(data => Deno.writeFile("output.mpc", data));
    });
});

Deno.bench('WASM - ImageMagick - convert image (sharpen)', async () => {
    const data = await Deno.readFile("input.mpc");
    ImageMagick.read(data, img => {
        img.sharpen(0, 2.0);
        img.write(data => Deno.writeFile("output.mpc", data));
    });
});
