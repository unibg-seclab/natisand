import { emptyDirSync } from "https://deno.land/std@0.161.0/fs/empty_dir.ts";
import { ensureDirSync } from "https://deno.land/std@0.161.0/fs/ensure_dir.ts";
import { nanoid } from "https://deno.land/x/nanoid@v3.0.0/mod.ts";
import { serve } from "https://deno.land/std@0.161.0/http/server.ts";

const encoder = new TextEncoder();

function toCString(str) {
  return encoder.encode(str + "\0");
}

const libName = "./libopusenc.so.0";

emptyDirSync("./server_files/");
ensureDirSync("./out");

const dylib = Deno.dlopen(
  libName,
  {
    "ope_comments_create": { parameters: [], result: "pointer" },
    "ope_comments_add": { parameters: ["pointer", "buffer", "buffer"], result: "usize"},
    "ope_encoder_create_file": { parameters: ["buffer", "pointer", "usize", "usize", "usize", "pointer"], result: "pointer" },
    "ope_encoder_write": { parameters: ["pointer", "buffer", "usize"], result: "usize"},
    "ope_encoder_drain": { parameters: ["pointer"], result: "usize" },
    "ope_encoder_destroy": { parameters: ["pointer"], result: "usize" },
    "ope_comments_destroy":{ parameters: ["pointer"], result: "usize" }
  },
);

const PORT = 5000;

function def_comments() {
	let comments_ptr = dylib.symbols.ope_comments_create();
        dylib.symbols.ope_comments_add(comments_ptr, toCString("ARTIST"), toCString("Someone"));
        dylib.symbols.ope_comments_add(comments_ptr, toCString("TITLE"), toCString("Some track"));
	return comments_ptr;
}

async function encode(file, enc) {
	let size = file.size;
        var bytes = await file.arrayBuffer();
	var ct = 0;
	while (ct < size) {
		let b_size;
		if (size - ct < 1024) {
		   b_size = size - ct;
		} else {
		   b_size = 1024;
		}
        	let buf = new Uint8Array(bytes.slice(ct, ct + b_size));
		let ret = buf.length / 4;
        	dylib.symbols.ope_encoder_write(enc, buf, ret);
		ct = ct + 1024;
	}
}

function clean(enc, comments_ptr) {
	dylib.symbols.ope_encoder_drain(enc);
        dylib.symbols.ope_encoder_destroy(enc);
        dylib.symbols.ope_comments_destroy(comments_ptr);
}

const handler = async (request) => {
	
	// Parse incoming request
    	const data = await request.formData();
    	const file = data.get("file");
    	
	// Resolve input and ouput template
    	const outputFilePath = `./server_files/${nanoid(20)}.opus`;

    	// Create dummy output file
    	await Deno.create(outputFilePath);

	let comments_ptr = def_comments();

        let enc = dylib.symbols.ope_encoder_create_file(toCString(outputFilePath), comments_ptr, 48000, 2, 0, null);
	
	await encode(file, enc);
	clean(enc, comments_ptr);
	const outputFileContent = await Deno.readFile(outputFilePath);

    	// Respond with the result of the execution
    	return new Response(outputFileContent);
};

// Run handler on incoming requests
serve(handler, { port: PORT });
