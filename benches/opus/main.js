const encoder = new TextEncoder();

function toCString(str) {
  return encoder.encode(str + "\0");
}

const libName = "./libopusenc.so.0";
Deno.create("MyOut2.opus");

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

Deno.bench("Create file", () => {
        let comments_ptr = dylib.symbols.ope_comments_create();
        let enc = dylib.symbols.ope_encoder_create_file(toCString("MyOut2.opus"), comments_ptr, 48000, 2, 0, null);
        dylib.symbols.ope_encoder_drain(enc);
        dylib.symbols.ope_encoder_destroy(enc);
        dylib.symbols.ope_comments_destroy(comments_ptr);
});

{
	let comments_ptr = dylib.symbols.ope_comments_create();
        dylib.symbols.ope_comments_add(comments_ptr, toCString("ARTIST"), toCString("Someone"));
        dylib.symbols.ope_comments_add(comments_ptr, toCString("TITLE"), toCString("Some track"));

        let enc = dylib.symbols.ope_encoder_create_file(toCString("MyOut2.opus"), comments_ptr, 48000, 2, 0, null);

        if(!enc){
                console.log("Ope Cannot open");
        }

        let file = await Deno.open("input.wav");
        let size = (await file.stat()).size;
        var ct = await file.seek(0, Deno.SeekMode.Start);

        let buf = new Uint8Array(1024);
        let ret = (await file.read(buf)) / 4;
	Deno.bench("Encode 1KB", () => {
		dylib.symbols.ope_encoder_write(enc, buf, ret);
	});
}
