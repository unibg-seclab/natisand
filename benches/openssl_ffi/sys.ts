const symbols = {
  //EVP_CIPHER_CTX_new: {
  //  parameters: [],
  //  result: "pointer"
  //},
  //EVP_CIPHER_fetch: {
  //  parameters: ["pointer", "buffer", "buffer"],
  //  result: "pointer"
  //},
  //OSSL_PARAM_construct_size_t: {
  //  parameters: ["buffer", "pointer"],
  //  result: "buffer"
  //},
  //EVP_EncryptInit_ex2: {
  //  parameters: ["pointer","pointer","buffer","buffer", "pointer"],
  //  result: "i32"
  //},
  //EVP_EncryptUpdate: {
  //  parameters: ["pointer", "buffer", "pointer", "buffer", "i32"],
  //  result: "i32"
  //},
  //EVP_EncryptFinal_ex: {
  //  parameters: ["pointer", "buffer", "pointer"],
  //  result: "i32"
  //},
  //OSSL_PARAM_construct_octet_string: {
  //  parameters: ["buffer", "buffer", "i32"],
  //  result: "buffer"
  //},
  //EVP_CIPHER_CTX_get_params: {
  //  parameters: ["pointer", "pointer"],
  //  result: "i32"
  //},
  //EVP_CIPHER_free: {
  //  parameters: ["pointer"],
  //  result: "void"
  //},
  //EVP_CIPHER_CTX_free: {
  //  parameters: ["pointer"],
  //  result: "void"
  //}
}

let lib: Deno.DynamicLibrary<typeof symbols>["symbols"];
const filename = "./libcrypto.so.3";
try {
	lib = Deno.dlopen(filename, symbols).symbols;
	console.log(">> dlopen woked!");
} catch (e) {
	throw e;
}

export default lib;

