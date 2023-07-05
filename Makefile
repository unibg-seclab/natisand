.PHONY: all clean debug release

MAKE                := make --no-print-directory

DENO_RELEASE        := target/release/deno
DENO_DEBUG          := target/debug/deno

all: debug

clean: 
	@cargo clean

# capability superset
_setcap:
	@sudo setcap cap_dac_override,cap_perfmon,cap_bpf,cap_sys_admin=ep $(DENO_RELEASE)

debug: _init_submodules
	@echo "[*] Build debug binary"
	@V8_FROM_SOURCE=1 cargo build 

_init_submodules:
	@echo "[*] CLONE v8 with Locker API"
	@git submodule update --init --recursive ext/v8
	@cd ext/v8; git checkout locker_api 

release: _init_submodules
	@echo "[*] Build release binary"
	@ V8_FROM_SOURCE=1 cargo build --release
