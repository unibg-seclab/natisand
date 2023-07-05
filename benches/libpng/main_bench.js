const encoder = new TextEncoder();

function toCString(str) {
  return encoder.encode(str + "\0");
}

const libName = "./libpng16.so";
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
    "fread": {parameters: ["pointer", "usize", "usize", "usize"], result: "usize"},
    "fclose": {parameters: ["pointer"], result: "usize"},
  }
);

let height = 600;
let width  = 800;
let bit_depth = 8;
let color_type = 6;

{
	let VERSION_STRING = toCString("1.6.39");

	Deno.bench("read_info", () => {

		let file_ptr = libc.symbols.fopen(toCString("input.png"), toCString("rb"));

		let png_ptr = dylib.symbols.png_create_read_struct(VERSION_STRING, null, null, null);
		let info_ptr = dylib.symbols.png_create_info_struct(png_ptr);
		dylib.symbols.png_init_io(png_ptr, file_ptr);
		dylib.symbols.png_read_info(png_ptr, info_ptr);

		let width = dylib.symbols.png_get_image_width(png_ptr, info_ptr);
		let height = dylib.symbols.png_get_image_height(png_ptr, info_ptr);
		let color_type = dylib.symbols.png_get_color_type(png_ptr, info_ptr);
		let bit_depth = dylib.symbols.png_get_bit_depth(png_ptr, info_ptr);

	});
}

{
	Deno.bench("verify_sig", () => {

		let file_ptr = libc.symbols.fopen(toCString("input.png"), toCString("rb"));
		let header_buff = new Uint8Array(8);
		let header = new Deno.UnsafePointerView(Deno.UnsafePointer.of(header_buff));
		libc.symbols.fread(header.pointer,1, 8, file_ptr);
		let _ = header_buff; // Avoid random garbage collection
                if (dylib.symbols.png_sig_cmp(header.pointer, 0, 8)) {
                        console.log("Not PNG");
                }
        });
}
