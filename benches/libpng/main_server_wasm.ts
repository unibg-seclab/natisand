import { emptyDirSync } from "https://deno.land/std@0.161.0/fs/empty_dir.ts";
import { ensureDirSync } from "https://deno.land/std@0.161.0/fs/ensure_dir.ts";
import { nanoid } from "https://deno.land/x/nanoid@v3.0.0/mod.ts";
import { serve } from "https://deno.land/std@0.161.0/http/server.ts";
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


const PORT = 5000;

ensureDirSync("server_files");
emptyDirSync("server_files");
ensureDirSync("server_files/in");
ensureDirSync("server_files/out");

let VERSION_STRING = toCString("1.6.39")
let height     = 600;
let width      = 800;
let bit_depth  = 8;
let color_type = 6;

const handler = async (request) => {
	
	// Parse incoming request
    	const data = await request.formData();
    	const file = data.get("file");
    
	// Resolve input and ouput template
    	const inputFilePath  = `./server_files/in/${nanoid(20)}.png`;
	const outputFilePath = `./server_files/out/${nanoid(20)}.png`;
	
	// Store input file
    	const inputFileContent = new Uint8Array(await file.arrayBuffer());
    	await Deno.writeFile(inputFilePath, inputFileContent);

        let file_ptr = instance.exports.fopen(toCString(inputFilePath), toCString("rb"));

        let png_ptr = instance.exports.png_create_read_struct(VERSION_STRING, 0, 0, 0);
        let info_ptr = instance.exports.png_create_info_struct(png_ptr);
        instance.exports.png_init_io(png_ptr, file_ptr);
        instance.exports.png_read_png(png_ptr, info_ptr, 0, null);
        let rows_ptr = instance.exports.png_get_rows(png_ptr, info_ptr);

        for (let y=0; y<height; y++) {
                let row_ptr = read_ptr(rows_ptr, 4*y);
                let row_buff = new Uint8Array(instance.exports.memory.buffer, row_ptr, 3200);
                for (let x=0; x<width; x++) {
                        row_buff[x*4] =  0;
                        row_buff[x*4 + 1] = 0;
                        row_buff[x*4 + 2] = 0;
                        row_buff[x*4 + 3] = 255;

                }
        }

        let out_ptr = instance.exports.fopen(toCString(outputFilePath), toCString("wb"));
        let png_out_ptr = instance.exports.png_create_write_struct(VERSION_STRING, null, null, null);

        let out_info_ptr = instance.exports.png_create_info_struct(png_out_ptr);
        instance.exports.png_init_io(png_out_ptr, out_ptr);
        instance.exports.png_set_IHDR(png_out_ptr, out_info_ptr, 800, 600, bit_depth, color_type, 0, 0, 0);
        instance.exports.png_write_info(png_out_ptr, out_info_ptr);
        instance.exports.png_write_image(png_out_ptr, rows_ptr);
        instance.exports.png_write_end(png_out_ptr, null);


    	const outputFileContent = await Deno.readFile(outputFilePath);
	// Respond with the result of the execution
    	return new Response(outputFileContent);
};

// Run handler on incoming requests
serve(handler, { port: PORT });
