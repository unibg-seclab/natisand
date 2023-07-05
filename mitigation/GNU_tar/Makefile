.PHONY: all tar clean

DENO_WITH_SANDBOX   := ../../target/release/deno

all: tar

tar:
        @mkdir -p output_archives/legitimate_dep output_archives/evil_dep
        @cp tar_legit_t.json tar_legit.json
        @cp tar_evil_t.json tar_evil.json
        @sed -i -e "s~<PATH_TO_USE_CASE_FOLDER>~`pwd`~g" tar_evil.json
        @sed -i -e "s~<PATH_TO_USE_CASE_FOLDER>~`pwd`~g" tar_legit.json
        @echo "Running test1"
        @$(DENO_WITH_SANDBOX) run --allow-run=tar --native-sandbox=./tar_legit.json test1.js
        @echo "Test1 done"
        @echo "Running test2"
        @$(DENO_WITH_SANDBOX) run --allow-run=tar test2.js
        @echo "Test2 done"
        @$(DENO_WITH_SANDBOX) run --allow-run=tar --native-sandbox=./tar_legit.json test1.js > /dev/null
        @echo "Running test3"
        @$(DENO_WITH_SANDBOX) run --allow-run=tar --native-sandbox=./tar_evil.json test3.js
        @echo "Test3 done"

clean:
        @rm -rf ./output_archives
        @rm tar_evil.json
        @rm tar_legit.json
