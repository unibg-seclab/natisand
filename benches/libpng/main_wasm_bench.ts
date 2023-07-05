import Context from "https://deno.land/std@0.165.0/wasi/snapshot_preview1.ts";


// Create the WASM instance
const context = new Context({
  args: Deno.args,
  env: Deno.env.toObject(),
  stdout: Deno.stdout.rid,
  preopens: { "/": "." },
});

const binary = await Deno.readFile("libpng.wasm");
const module = await WebAssembly.compile(binary);
const instance = await WebAssembly.instantiate(module, {
  "wasi_snapshot_preview1": context.exports,
});

context.start(instance);
// Allocate a cstring
function toCString(s: string): Deno.UnsafePointerView {

    let c_string = new TextEncoder().encode(`${s}\0`);

    // Prepare chunk memory
    return chunk_alloc(c_string);
}

// Read a pointer of 32 bits from a base pointer + offset
function read_ptr(base: Deno.UnsafePointer, offset: number): number {

        // Read bytes of ptr
        let b = new Uint8Array(instance.exports.memory.buffer, base + offset, 4);

        // Convert buffer to raw pointer value
        var ptr = 0;
        var p = 0;

        // The first is the LSB
        for (let i = 0; i < 4;i++){
                ptr += b[i] * Math.pow(2, p);
                p += 8;
        }
        return ptr;
}

// Allocate a chunk of memory
function chunk_alloc(chunk: Uint8Array): Deno.UnsafePointerView {
    // Prepare chunk memory
    	let chunk_ptr = instance.exports.malloc(chunk.length);

    if (chunk_ptr === 0) {
        throw new SqliteError("Out of memory.");
    }
    const mem = new Uint8Array(instance.exports.memory.buffer, chunk_ptr, chunk.length);
    mem.set(chunk);
    return chunk_ptr;
}

{
	let VERSION_STRING = toCString("1.6.39");

	let file_ptr = instance.exports.fopen(toCString("input.png"), toCString("rb"));

	let png_ptr = instance.exports.png_create_read_struct(VERSION_STRING, null, null, null);
	let info_ptr = instance.exports.png_create_info_struct(png_ptr);
	instance.exports.png_init_io(png_ptr, file_ptr);
	instance.exports.png_read_info(png_ptr, info_ptr);

	Deno.bench("read_info", () => {
		let width = instance.exports.png_get_image_width(png_ptr, info_ptr);
		let height = instance.exports.png_get_image_height(png_ptr, info_ptr);
		let color_type = instance.exports.png_get_color_type(png_ptr, info_ptr);
		let bit_depth = instance.exports.png_get_bit_depth(png_ptr, info_ptr);

	});
}

{
	let file_ptr = instance.exports.fopen(toCString("input.png"), toCString("rb"));
        let header = chunk_alloc(new Uint8Array(8));
	Deno.bench("verify_sig", () => {
		instance.exports.fread(header, 1, 8, file_ptr);	
		if (instance.exports.png_sig_cmp(header, 0, 8)) {
			//console.log("Not PNG");
		}
        });
}
