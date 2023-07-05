.PHONY: all convert clean

DENO_WITH_SANDBOX   := ../../target/release/deno

all: convert

convert:
	@cp gm_t.json gm.json
	@sed -i -e "s~<PATH_TO_USE_CASE_FOLDER>~`pwd`~g" gm.json
	@echo "Running test1"
	@$(DENO_WITH_SANDBOX) run --allow-run=gm --native-sandbox=./gm.json test1.js
	@echo "Test1 done"
	@echo "Running test2"
	@$(DENO_WITH_SANDBOX) run --allow-run=gm test2.js
	@echo "Test2 done"
	@echo "Running test3"
	@$(DENO_WITH_SANDBOX) run --allow-run=gm --native-sandbox=./gm.json test3.js
	@echo "Test3 done"

clean:
	@rm -rf ./output_images/*
	@rm ./gm.json
