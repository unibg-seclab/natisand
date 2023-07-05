import Context from "https://deno.land/std@0.163.0/wasi/snapshot_preview1.ts";

const context = new Context({
  args: Deno.args,
  env: Deno.env.toObject(),
  preopens: {
	"./": "./"
	}
});

const binary = await Deno.readFile("open.wasm");
const module = await WebAssembly.compile(binary);


Deno.bench('WebAssembly WASI open file', async () => {
    const instance = await WebAssembly.instantiate(module, {
      "wasi_snapshot_preview1": context.exports,
    });
    context.start(instance);
});

