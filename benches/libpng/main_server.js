import { emptyDirSync } from "https://deno.land/std@0.161.0/fs/empty_dir.ts";
import { ensureDirSync } from "https://deno.land/std@0.161.0/fs/ensure_dir.ts";
import { nanoid } from "https://deno.land/x/nanoid@v3.0.0/mod.ts";
import { serve } from "https://deno.land/std@0.161.0/http/server.ts";

const encoder = new TextEncoder();

function toCString(str) {
  return encoder.encode(str + "\0");
}

const libName = "./libpng16.so";
const PORT = 5000;

ensureDirSync("server_files");
emptyDirSync("server_files");
ensureDirSync("server_files/in");
ensureDirSync("server_files/out");
Deno.create("out.png");
const dylib = Deno.dlopen(
  libName,
  {
    "png_create_read_struct": { parameters: ["buffer", "pointer", "pointer", "pointer"], result: "pointer" },
    "png_create_info_struct": { parameters: ["pointer"], result: "pointer" },
    "png_init_io": { parameters: ["pointer", "pointer"], result: "void" },
    "png_set_sig_bytes": { parameters: ["pointer", "usize"], result: "void" },
    "png_read_info": { parameters: ["pointer", "pointer"], result: "void" },
    "png_get_image_width": { parameters: ["pointer", "pointer"], result: "usize" },
    "png_get_image_height": { parameters: ["pointer", "pointer"], result: "usize" },
    "png_get_color_type": { parameters: ["pointer", "pointer"], result: "usize" },
    "png_get_bit_depth": { parameters: ["pointer", "pointer"], result: "usize" },
    "png_set_interlace_handling": { parameters: ["pointer"], result: "usize" },
    "png_read_update_info": { parameters: ["pointer", "pointer"],  result: "void" },
    "png_get_rowbytes": { parameters: ["pointer", "pointer"], result: "usize" },
    "png_read_png": { parameters: ["pointer", "pointer", "usize", "pointer"], result: "void" },
    "png_get_rows": { parameters: ["pointer", "pointer"], result: "pointer" },
    "png_create_write_struct": { parameters: ["buffer", "pointer", "pointer", "pointer"], result: "pointer" },
    "png_write_image": { parameters: ["pointer", "pointer"], result: "void" },
    "png_write_end": { parameters: ["pointer", "pointer"], result: "void" },
    "png_write_info": { parameters: ["pointer", "pointer"], result: "void" },
    "png_set_IHDR": { parameters: ["pointer", "pointer", "usize", "usize", "usize", "usize", "usize", "usize"], result: "void" },
    "png_sig_cmp": { parameters: ["pointer", "usize", "usize"], result: "bool" },
  },
);

const libc = Deno.dlopen(
  "libc.so.6",
  { 
    "fopen": {parameters: ["buffer", "buffer"], result: "pointer"},
    "malloc": {parameters: ["usize"], result: "pointer"},
    "fclose": {parameters: ["pointer"], result: "usize"}
  }
);

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
        Deno.create(outputFilePath);
	// Store input file
    	const inputFileContent = new Uint8Array(await file.arrayBuffer());
    	await Deno.writeFile(inputFilePath, inputFileContent);

	let file_ptr = libc.symbols.fopen(toCString(inputFilePath), toCString("rb"));
	let png_ptr = dylib.symbols.png_create_read_struct(VERSION_STRING, null, null, null);
	let info_ptr = dylib.symbols.png_create_info_struct(png_ptr);
	dylib.symbols.png_init_io(png_ptr, file_ptr);

	dylib.symbols.png_read_png(png_ptr, info_ptr, 0, null);

	let rows_ptr = new Deno.UnsafePointerView(dylib.symbols.png_get_rows(png_ptr, info_ptr));
	for (let y=0; y<height; y++) {
		let row_ptr = new Deno.UnsafePointerView(rows_ptr.getBigUint64(8*y));
		let dv = new DataView(row_ptr.getArrayBuffer(4*width));
		for (let x=0; x<width; x++) {
			dv.setUint8(x*4, 0);
			dv.setUint8(x*4 + 1, 0);
			dv.setUint8(x*4 + 2, 0);
			dv.setUint8(x*4 + 3, 255);
		}
	}
	let out_ptr = libc.symbols.fopen(toCString(outputFilePath), toCString("wb"));
	let png_out_ptr = dylib.symbols.png_create_write_struct(VERSION_STRING, null, null, null);

	let out_info_ptr = dylib.symbols.png_create_info_struct(png_out_ptr);
	dylib.symbols.png_init_io(png_out_ptr, out_ptr);
	dylib.symbols.png_set_IHDR(png_out_ptr, out_info_ptr, 800, 600, bit_depth, color_type, 0, 0, 0);
	dylib.symbols.png_write_info(png_out_ptr, out_info_ptr);
	dylib.symbols.png_write_image(png_out_ptr, rows_ptr.pointer);
	dylib.symbols.png_write_end(png_out_ptr, null);
	libc.symbols.fclose(out_ptr);

    	const outputFileContent = await Deno.readFile(outputFilePath);
	// Respond with the result of the execution
    	return new Response(outputFileContent);
};

// Run handler on incoming requests
serve(handler, { port: PORT });
