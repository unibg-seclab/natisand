import opusenc from "./opusenc.js"; // import emscripten WASM wrapper

let mod = await opusenc({input: "MyOut.opus", 'arguments': ['inputFile']});
let instance = { exports: mod.asm};

// Allocate a cstring
function toCString(s: string): Deno.UnsafePointerView {

    let c_string = new TextEncoder().encode(`${s}\0`);

    // Prepare chunk memory
    return chunk_alloc(c_string);
}

let chunk_ptr = {};

// Allocate a chunk of memory
function chunk_alloc(chunk: Uint8Array): Deno.UnsafePointerView {
    // Prepare chunk memory
    if (!(chunk.length in chunk_ptr)) {
    	chunk_ptr[chunk.length] = instance.exports.malloc(chunk.length);
    }

    if (chunk_ptr[chunk.length] === 0) {
        throw new SqliteError("Out of memory.");
    }
    const mem = new Uint8Array(instance.exports.memory.buffer, chunk_ptr[chunk.length], chunk.length);
    mem.set(chunk);
    return chunk_ptr[chunk.length];
}

Deno.bench("Create file", async () => {
	let comments_ptr = instance.exports.ope_comments_create();
	let enc = instance.exports.ope_encoder_create_file(toCString("MyOut.opus"), comments_ptr, 48000, 2, 0, null);
	instance.exports.ope_encoder_drain(enc);
	instance.exports.ope_encoder_destroy(enc);
        instance.exports.ope_comments_destroy(comments_ptr);
});

{
        let comments_ptr = instance.exports.ope_comments_create();
        instance.exports.ope_comments_add(comments_ptr, toCString("ARTIST"), toCString("Someone"));
        instance.exports.ope_comments_add(comments_ptr, toCString("TITLE"), toCString("Some track"));

        let enc = instance.exports.ope_encoder_create_file(toCString("MyOut2.opus"), comments_ptr, 48000, 2, 0, null);

        if(!enc){
                console.log("Ope Cannot open");
        }

        let file = await Deno.open("input.wav");
        let size = (await file.stat()).size;
        var ct = await file.seek(0, Deno.SeekMode.Start);

        let buf = new Uint8Array(1024);
        let ret = (await file.read(buf)) / 4;
	Deno.bench("Encode 1KB", () => {
        	instance.exports.ope_encoder_write(enc, chunk_alloc(buf), ret);
	});
}
