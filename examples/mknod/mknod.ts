// ffi.ts

// Determine library path based on current script path
const dirname = new URL('.', import.meta.url).pathname;

// Determine library extension based on your OS.
let libSuffix = "";
switch (Deno.build.os) {
  case "windows":
    libSuffix = "dll";
    break;
  case "darwin":
    libSuffix = "dylib";
    break;
  default:
    libSuffix = "so";
    break;
}

const libName = `${dirname}libmknod.${libSuffix}`;
// Open library and define exported symbols
const dylib = Deno.dlopen(
  libName,
  {
    "my_mknod": { parameters: [], result: "void" },
  } as const,
);

// Call the symbol `mknod`
dylib.symbols.my_mknod();
