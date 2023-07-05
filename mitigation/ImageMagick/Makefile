.PHONY: all convert clean

DENO_WITH_SANDBOX   := ../../target/release/deno

all: convert

convert:
	@cp im_t.json im.json
	@sed -i -e "s~<PATH_TO_USE_CASE_FOLDER>~`pwd`~g" im.json
	@echo "Running test1"
	@$(DENO_WITH_SANDBOX) run --allow-run=convert --native-sandbox=./im.json test1.js
	@echo "Test1 done"
	@echo "Running test2"
	@$(DENO_WITH_SANDBOX) run --allow-run=convert test2.js
	@echo "Test2 done"
	@echo "Running test3"
	@$(DENO_WITH_SANDBOX) run --allow-run=convert --native-sandbox=./im.json test3.js
	@echo "Test3 done"

clean:
	@rm -rf ./output_images/*
	@rm ./im.json
