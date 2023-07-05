import { ensureFileSync, ensureDirSync } from "https://deno.land/std/fs/mod.ts";

Deno.removeSync("./pipes", { recursive: true } );
ensureDirSync("./pipes");
ensureFileSync("./empty");

const libName = "./libsyscalls.so";

// Sync symbols
const dylib_sync = Deno.dlopen(
  libName,
  {
    "open_bench": { parameters: ["buffer"], result: "void" },
    "listen_bench": { parameters: [], result: "void" },
    "connect_bench": { parameters: [], result: "void" },
    "fifo_bench": { parameters: ["buffer", "buffer"], result: "void" },
  },
);

// Async symbols
const dylib_async = Deno.dlopen(
  libName,
  {
    "open_bench": { parameters: ["buffer"], result: "void", nonblocking: true },
    "listen_bench": { parameters: [], result: "void", nonblocking: true },
    "connect_bench": { parameters: [], result: "void", nonblocking: true },
    "fifo_bench": { parameters: ["buffer", "buffer"], result: "void", nonblocking: true },
  },
);

Deno.bench("warmup - sync", () => { 
        const encoder = new TextEncoder();
        const pathname = encoder.encode("empty" + "\0");
        dylib_sync.symbols.open_bench(pathname);
});

Deno.bench("open - sync", () => {
        const encoder = new TextEncoder();
        const pathname = encoder.encode("empty" + "\0");
        dylib_sync.symbols.open_bench(pathname);
});


Deno.bench("open - async", async () => { 
        const encoder = new TextEncoder();
        const pathname = encoder.encode("empty" + "\0");
        await dylib_async.symbols.open_bench(pathname);
});

Deno.bench("listen - sync", () => {
        dylib_sync.symbols.listen_bench();
});

Deno.bench("listen - async", async () => { 
        await dylib_async.symbols.listen_bench();
});

Deno.bench("connect - sync", () => {
        let listener = Deno.listen({ hostname: "127.0.0.1", port: 8000 });
        dylib_sync.symbols.connect_bench();
        listener.close();
});

Deno.bench("connect - async", async () => { 
        let listener = Deno.listen({ hostname: "127.0.0.1", port: 8000 });
        dylib_sync.symbols.connect_bench();
        await dylib_async.symbols.connect_bench();
        listener.close();
});


let fnames_set = new Set();
while (fnames_set.size < 50000) {
        fnames_set.add(Math.floor(Math.random() * 100000));
}

let fnames = Array.from(fnames_set);
var i = 0;

Deno.bench("fifo - sync", () => {
        let fname = fnames[i]; 
        const encoder = new TextEncoder();
        const pathname = encoder.encode(`./pipes/myfifo${fname}` + "\0");
        const msg = encoder.encode("mymessage" + "\0");
        dylib_sync.symbols.fifo_bench(pathname, msg);
        i += 1;
});
