.PHONY: sleep mknod open

DENO = ../target/release/deno

sleep:
	$(DENO) run --allow-run=sleep --native-sandbox=sleep/sleep.json sleep/sleep.js

mknod:
	@rm -f random
	$(DENO) run --allow-ffi --unstable --native-sandbox=mknod/mknod.json mknod/mknod.ts

open:
	@rm -f random
	@touch random
	$(DENO) run --allow-ffi --unstable --native-sandbox=open/open.json open/open.ts
