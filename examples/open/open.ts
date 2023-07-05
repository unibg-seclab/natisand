// ffi.ts

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

const libName = `${dirname}libopen.${libSuffix}`;
// Open library and define exported symbols
const dylib = Deno.dlopen(
  libName,
  {
    "open": { parameters: [], result: "void" },
  } as const,
);

// Call the symbol `open`
dylib.symbols.open();
