import lib from "./sys.ts";

const {
	//EVP_CIPHER_CTX_new,
	//EVP_CIPHER_fetch,
	//OSSL_PARAM_construct_size_t,
	//EVP_EncryptInit_ex2,
	//EVP_EncryptUpdate,
	//EVP_EncryptFinal_ex,
	//OSSL_PARAM_construct_octet_string,
	//EVP_CIPHER_CTX_get_params,
	//EVP_CIPHER_free,
	//EVP_CIPHER_CTX_free
} = lib;

const { getArrayBuffer, getCString } = Deno.UnsafePointerView;
const encode = Deno.core?.encode || ((s) => new TextEncoder().encode(s));
function cstr(str?: string) {
  return str ? encode(str + "\0") : null;
}

const ctx = EVP_CIPHER_CTX_new();
