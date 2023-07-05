.PHONY: all convert gm_convert im_convert im_convert_wasm libpng libxml mysql sqlite syscalls openssl opus gpg tesseract wasm_wasi_open

MAKE                := make --no-print-directory

DENO                := ./deno
DENO_WITH_SANDBOX   := ../target/release/deno
SERVER              := $(DENO)

DATA                := subprocess/data
IMAGE               := subprocess/data/sample-image.jpg
NUMBERS             := subprocess/data/numbers.csv
OCR_IMAGE			:= subprocess/data/ocr-sample-image.png
OCR_IMAGES          := subprocess/data/ocr-image-samples
SQLITE_PATH         := $(shell ldconfig -p | grep libsqlite3.so | awk '{ print $$4 }')
TRADE_DATA          := subprocess/data/international-trade-data
TRADE_DATA_PARTIAL  := subprocess/data/international-trade-data/output_csv_partial.csv
TRADE_DATA_SMALL    := subprocess/data/international-trade-data/output_csv_small.csv
WIKIDATA            := subprocess/data/wikidatawiki-latest-pages-logging.xml

BANDWIDTH           := 1000
LATENCY             := 10

all: sqlite convert gm_convert im_convert im_convert_wasm openssl gpg tesseract

subprocess: subprocess-micro subprocess-macro
subprocess-micro: _subprocess-micro-prerequisites _generate-subprocess-micro-tests _generate-subprocess-micro-policies _coreutils

_subprocess-micro-prerequisites:
	@test -f $(DENO) || (wget https://github.com/denoland/deno/releases/download/v1.25.2/deno-x86_64-unknown-linux-gnu.zip && unzip deno-x86_64-unknown-linux-gnu.zip && rm deno-x86_64-unknown-linux-gnu.zip)
	@mkdir -p $(DATA)
	@test -f $(WIKIDATA) || (wget -O $(WIKIDATA).gz https://dumps.wikimedia.org/wikidatawiki/latest/wikidatawiki-latest-pages-logging.xml.gz && gzip -d $(WIKIDATA).gz && truncate -s 100M $(WIKIDATA))
	@test -d $(TRADE_DATA) || (wget -O $(TRADE_DATA).zip https://stats.govt.nz/assets/Uploads/International-trade/International-trade-June-2022-quarter/Download-data/international-trade-june-2022-quarter-csv.zip && unzip $(TRADE_DATA).zip -d $(TRADE_DATA) && rm $(TRADE_DATA).zip)
	@test -f $(TRADE_DATA_PARTIAL) || head -n 1000 $(TRADE_DATA)/output_csv_full.csv > $(TRADE_DATA_PARTIAL)
	@test -f $(TRADE_DATA_SMALL) || head -n 100 $(TRADE_DATA)/output_csv_full.csv > $(TRADE_DATA_SMALL)
	@test -f $(NUMBERS) || shuf -i 0-10000 > $(NUMBERS)

_generate-subprocess-micro-tests:
	@echo "[*] Generating coreutils tests..."
	@test -d subprocess/tests || (cd subprocess; ./export_tests.py tests.json tests)

_generate-subprocess-micro-policies:
	@echo "[*] Downloading Minijail repository..."
	@git submodule update --init subprocess/minijail
	@echo "[*] Generating coreutils policies..."
	@test -f policies/subprocess/minijail/b2sum.bpf || (cd subprocess; MINIJAIL=minijail ../policies/subprocess/generate_minijail_seccomp_binaries.py tests.json ../policies/subprocess/minijail/)
	@test -f policies/subprocess/coreutils.json || (cd subprocess; ../policies/subprocess/generate_native_sandbox_policy.py tests.json ../policies/subprocess/coreutils.json)

_coreutils:
	@echo "\n[*] Running coreutils benchmark (deno) ..."
	@cd subprocess; ../$(DENO) bench --allow-read --allow-run --unstable --quiet bench.js -- tests.json
	@echo "\n[*] Running coreutils benchmark with native sandbox (deno) ..."
	@cd subprocess; \
	 for test in tests/*; do \
		echo "\n[*] Running $$test..."; \
		../$(DENO_WITH_SANDBOX) bench --allow-read --allow-run --filter "default" --native-sandbox=../policies/subprocess/coreutils.json --unstable --quiet bench.js -- $$test; \
	 done

subprocess-macro: _subprocess-macro-prerequisites _generate-subprocess-macro-tests _generate-subprocess-macro-policies
	@$(MAKE) _add_network_emulation
	@echo "[*] Running image processing benchmark (deno) ..."
	@$(MAKE) _image-processing TESTS=server_tests.json
	@echo "\n[*] Running image processing benchmark with native sandbox (deno) ..."
	@for test in subprocess/server_tests/*; do \
		echo "\n[*] Running $$test..."; \
		test_without_prefix=$${test#subprocess/}; \
		$(MAKE) _image-processing FILTER="--filter default" NATIVE_SANDBOX=--native-sandbox=../policies/subprocess/image-processing.json SERVER=$(DENO_WITH_SANDBOX) TESTS=$$test_without_prefix; \
	done
	@$(MAKE) _remove_network_emulation

_subprocess-macro-prerequisites:
	@test -f $(DENO) || (wget https://github.com/denoland/deno/releases/download/v1.25.2/deno-x86_64-unknown-linux-gnu.zip && unzip deno-x86_64-unknown-linux-gnu.zip && rm deno-x86_64-unknown-linux-gnu.zip)
	@mkdir -p $(DATA)
	@test -f $(IMAGE) || (wget http://phoronix-test-suite.com/benchmark-files/sample-photo-6000x4000-1.zip && unzip sample-photo-6000x4000-1.zip && convert sample-photo-6000x4000.JPG -resize 2048x1080 $(IMAGE) && rm sample-photo-6000x4000-1.zip sample-photo-6000x4000.JPG)
	@test -d $(OCR_IMAGES) || (wget https://phoronix-test-suite.com/benchmark-files/ocr-image-samples-1.zip && unzip ocr-image-samples-1.zip -d $(OCR_IMAGES) && rm ocr-image-samples-1.zip)
	@test -f $(OCR_IMAGE) || wget -O $(OCR_IMAGE) https://brtschool.co.uk/wp-content/uploads/test.png

_generate-subprocess-macro-tests:
	@echo "[*] Generating image processing tests..."
	@test -d subprocess/server_tests || (cd subprocess; ./export_tests.py server_tests.json server_tests)

_generate-subprocess-macro-policies:
	@echo "[*] Downloading Minijail repository..."
	@git submodule update --init subprocess/minijail
	@echo "[*] Generating image processing policies..."
	@test -f policies/subprocess/minijail/graphicsmagick-1-1.bpf || (cd subprocess; MINIJAIL=minijail ../policies/subprocess/generate_minijail_seccomp_binaries.py server_tests.json ../policies/subprocess/minijail/)
	@test -f policies/subprocess/image-processing.json || (cd subprocess; ../policies/subprocess/generate_native_sandbox_policy.py server_tests.json ../policies/subprocess/image-processing.json)

_image-processing: _start-server _request-image-processing _stop-server

_start-server:
	@test -f subprocess/.server.pid && $(MAKE) _stop-server || true
	@echo "Starting server..."
	@cd subprocess; ../$(SERVER) run --allow-all $(NATIVE_SANDBOX) --quiet std_server.js & echo $$! > .server.pid
	@sleep 1

_start-server-sqlite-sandboxed:
	@test -f sqlite/.server.pid && $(MAKE) _stop-server-sqlite || true
	@echo "Starting server with native sandbox for sqlite benchmarks..."
	@cd sqlite; DENO_SQLITE_PATH=$(SQLITE_PATH) ../$(DENO_WITH_SANDBOX) --unstable run -A --native-sandbox=../policies/sqlite3.json --quiet main_server_sandbox.js & echo $$! > .server.pid
	@sleep 1

_start-server-sqlite:
	@test -f sqlite/.server.pid && $(MAKE) _stop-server-sqlite || true
	@echo "Starting server for sqlite benchmarks..."
	@cd sqlite; DENO_SQLITE_PATH=$(SQLITE_PATH) ../$(DENO) --unstable run -A --quiet $(SCRIPT_NAME) & echo $$! > .server.pid
	@sleep 1

_start-server-opus-sandboxed:
	@test -f opus/.server.pid && $(MAKE) _stop-server-opus || true
	@echo "Starting server with native sandbox for opus benchmarks..."
	@cd opus; ../$(DENO_WITH_SANDBOX) --unstable run -A --native-sandbox=../policies/libopusenc_unpriv.json --quiet main_server_sandbox.js & echo $$! > .server.pid
	@sleep 1

_start-server-opus:
	@test -f opus/.server.pid && $(MAKE) _stop-server-opus || true
	@echo "Starting server for opus benchmarks..."
	@cd opus; ../$(DENO) --unstable run -A --quiet $(SCRIPT_NAME) & echo $$! > .server.pid
	@sleep 1

_start-server-libpng-sandboxed:
	@test -f libpng/.server.pid && $(MAKE) _stop-server-libpng || true
	@echo "Starting server with native sandbox for libpng benchmarks..."
	@cd libpng; ../$(DENO_WITH_SANDBOX) --unstable run -A --native-sandbox=../policies/libpng_server.json --quiet main_server.js & echo $$! > .server.pid
	@sleep 1

_start-server-libpng:
	@test -f libpng/.server.pid && $(MAKE) _stop-server-libpng || true
	@echo "Starting server for libpng benchmarks..."
	@cd libpng; ../$(DENO) --unstable run -A --quiet $(SCRIPT_NAME) & echo $$! > .server.pid
	@sleep 1

_request-image-processing:
	@cd subprocess; ../$(DENO) bench --allow-read --allow-net $(FILTER) --unstable --quiet server_bench.js -- $(TESTS)

_stop-server:
	@if test -f subprocess/.server.pid; then \
	    echo "Stopping server..."; \
	    kill `cat subprocess/.server.pid`; \
	    rm subprocess/.server.pid; \
	fi

_stop-server-sqlite:
	@if test -f sqlite/.server.pid; then \
            echo "Stopping server..."; \
            kill `cat sqlite/.server.pid`; \
            rm sqlite/.server.pid; \
        fi

_stop-server-opus:
	@if test -f opus/.server.pid; then \
            echo "Stopping server..."; \
            kill `cat opus/.server.pid`; \
            rm opus/.server.pid; \
        fi

_stop-server-libpng:
	@if test -f libpng/.server.pid; then \
            echo "Stopping server..."; \
            kill `cat libpng/.server.pid`; \
            rm libpng/.server.pid; \
        fi

subprocess-macro-wrk: _subprocess-macro-prerequisites _generate-subprocess-macro-policies _generate-subprocess-macro-wrk-configs
	@$(MAKE) _add_network_emulation
	@echo "[*] Running wrk image processing benchmark (wrk) ..."
	@$(MAKE) _image-processing-wrk OUTPUT=subprocess/wrk/results PATTERN=*.json
	@echo "\n[*] Running image processing benchmark with native sandbox (wrk) ..."
	@$(MAKE) _image-processing-wrk NATIVE_SANDBOX=--native-sandbox=../policies/subprocess/image-processing.json OUTPUT=subprocess/wrk/native-sandbox-results PATTERN=*-default.json SERVER=$(DENO_WITH_SANDBOX)
	@$(MAKE) _remove_network_emulation

sqlite-macro-wrk:
	@sed -i -e "s/<PATH_TO_NORTHWIND>/$(shell pwd | sed -e 's~/~\\\/~g')\/sqlite\/northwind.sqlite/g" policies/sqlite3.json
	@cd sqlite3/bench; ./download.sh; cp ./northwind.sqlite ../../sqlite/;
	@$(MAKE) _add_network_emulation
	@echo "[*] Running wrk sqlite benchmark (wrk) ..."
	@$(MAKE) _start-server-sqlite SCRIPT_NAME=main_server.js
	@wrk -t4 -c4 -d30s --timeout 5s http://localhost:5000
	@$(MAKE) _stop-server-sqlite
	@echo "[*] Running wrk native sandbox sqlite benchmark (wrk) ..."
	@$(MAKE) _start-server-sqlite-sandboxed
	@wrk -t4 -c4 -d30s --timeout 5s http://localhost:5000
	@$(MAKE) _stop-server-sqlite
	@echo "[*] Running wrk WASM sqlite benchmark (wrk) ..."
	@$(MAKE) _start-server-sqlite SCRIPT_NAME=main_server_wasm.js
	@wrk -t4 -c4 -d30s --timeout 5s http://localhost:5000
	@$(MAKE) _remove_network_emulation
	@$(MAKE) _stop-server-sqlite

_generate-subprocess-macro-wrk-configs:
	@echo "[*] Generating wrk benchmark configurations..."
	@test -d subprocess/wrk/configs || (cd subprocess/wrk; ../../$(DENO) run --allow-all --quiet export_server_bench.js)

_image-processing-wrk:
	@mkdir -p $(OUTPUT)
	@for config in subprocess/wrk/configs/$(PATTERN); do \
		echo "\n[*] Running $$config..."; \
		$(MAKE) _start-server; \
		env config=$$config output=$(OUTPUT) wrk -t4 -c4 -d30s -s subprocess/wrk/configure_requests.lua --timeout 5s http://localhost:5000; \
		$(MAKE) _stop-server; \
		sleep 5; \
	done

sqlite:
	echo $(SQLITE_PATH)
	@sed -i -e "s/<PATH_TO_NORTHWIND>/$(shell pwd | sed -e 's~/~\\\/~g')\/sqlite\/northwind.sqlite/g" policies/sqlite3.json
	@sed -i -e "s/<PATH_TO_NORTHWIND>/$(shell pwd | sed -e 's~/~\\\/~g')\/sqlite\/northwind.sqlite/g" policies/sqlite3_whole_lib.json
	@cd sqlite3/bench; ./download.sh; cp ./northwind.sqlite ../../sqlite/;
	@echo "[*] Deno FFI benchmark"
	@cd sqlite; DENO_SQLITE_PATH=$(SQLITE_PATH) ../$(DENO) --unstable bench -A ./main.js
	@echo "[*] Deno FFI sandboxed benchmark"
	@cd sqlite; DENO_SQLITE_PATH=$(SQLITE_PATH) ../$(DENO_WITH_SANDBOX) --unstable --quiet bench --filter "open" -A --native-sandbox=../policies/sqlite3_whole_lib.json ./main.js
	@cd sqlite; DENO_SQLITE_PATH=$(SQLITE_PATH) ../$(DENO_WITH_SANDBOX) --unstable --quiet bench -A --native-sandbox=../policies/sqlite3.json ./main_sandbox.js
	@echo "[*] Deno wasm benchmark"
	@cd sqlite; DENO_SQLITE_PATH=$(SQLITE_PATH) ../$(DENO_WITH_SANDBOX) --unstable bench -A ./main_wasm.js 

deno:
	@$(DENO_WITH_SANDBOX) --unstable bench -A --native-sandbox=./policies/deno_ffi.json ../test_ffi/tests/bench.js

_add_network_emulation:
	@echo "[*] Enabling network emulation with a $(BANDWIDTH)Mbps bandwidth and $(LATENCY)ms latency..."
	sudo tc qdisc add dev lo root handle 1: tbf rate $(BANDWIDTH)mbit burst 10mbit latency 10ms
	sudo tc qdisc add dev lo parent 1: netem delay $(LATENCY)ms

_remove_network_emulation:
	@echo "[*] Removing network emulation..."
	sudo tc qdisc del dev lo root handle 1:

_setup_convert:
	@echo "[*] Download image from Phoronix Test Suite"
	@wget http://phoronix-test-suite.com/benchmark-files/sample-photo-6000x4000-1.zip
	@unzip sample-photo-6000x4000-1.zip
	@mv sample-photo-6000x4000.JPG image-conversion/input.mpc
	@rm sample-photo-6000x4000-1.zip

mysql:
	@cd mysql; ../$(DENO_WITH_SANDBOX) --unstable bench --no-check --allow-ffi --allow-env --native-sandbox=../policies/mysql.json ./main.js

syscalls:
	@cd syscalls; gcc -c -O3 -o syscalls.o syscalls.c
	@cd syscalls; gcc -shared -W -o libsyscalls.so syscalls.o
	@sed -i -e "s/<PATH_TO_BENCH>/$(shell pwd | sed -e 's~/~\\\/~g')\/syscalls/g" policies/syscalls.json
	@cd syscalls; ../$(DENO_WITH_SANDBOX) --unstable bench -A --native-sandbox=../policies/syscalls.json ./main.js
    
convert: gm_convert im_convert im_convert_wasm

gm_convert: _setup_convert
	@cd image-conversion; ../$(DENO_WITH_SANDBOX) --unstable bench --filter "Native" --allow-run=gm --native-sandbox=../policies/gm.json ./gm.js
im_convert: _setup_convert
	@cd image-conversion; ../$(DENO_WITH_SANDBOX) --unstable bench --filter "Native" --allow-run=convert --native-sandbox=../policies/im.json ./im.js
im_convert_wasm: _setup_convert
	@cd image-conversion; ../$(DENO_WITH_SANDBOX) --unstable bench --filter "WASM" --allow-run=convert --allow-read --allow-write ./im.js

openssl: 
	@echo "[*] OpenSSL benchmark"
	@cd openssl; ../$(DENO_WITH_SANDBOX) --unstable bench --allow-run=openssl --native-sandbox=../policies/openssl.json ./openssl.js

gpg:
	@echo "[*] GPG benchmark"
	@cp policies/gpg_template.json policies/gpg.json
	@sed -i -e "s~<PATH_TO_HOME>~`echo $(HOME)`~g" policies/gpg.json
	@sed -i -e "s~<PATH_TO_GPG_BENCH>~`pwd`\/gpg~g" policies/gpg.json
	@cd gpg; ../$(DENO_WITH_SANDBOX) --unstable bench --allow-run=gpg --native-sandbox=../policies/gpg.json ./gpg.js

tesseract:
	@echo "[*] Tesseract benchmark"
	@cp policies/tesseract_template.json policies/tesseract.json
	@sed -i -e "s~<PATH_TO_TESSERACT_BENCH>~`pwd`\/tesseract~g" policies/tesseract.json
	@echo "[*] installing tesseract-ocr"
	@sudo apt install tesseract-ocr
	@echo "[*] Download images from Phoronix Test Suite"
	@cd tesseract; if [ ! -f "ocr-image-samples-1.zip" ]; then wget https://phoronix-test-suite.com/benchmark-files/ocr-image-samples-1.zip; fi
	@cd tesseract; unzip -o ocr-image-samples-1.zip
	@cd tesseract; ../$(DENO_WITH_SANDBOX) --unstable bench --allow-run=tesseract --native-sandbox=../policies/tesseract.json ./tesseract.js
	@echo "[*] Cleaning generated files"
	@cd tesseract; rm ocr-sample-*; rm output*;


wasm_wasi_open:
	@echo '[*] WebAssembly WASI open file'
	@cd syscalls/wasm/open; ../../../../$(DENO_RELEASE) --unstable bench -A ./open.js

libxml:
	@echo "[*] Libxml2 benchmark"
	@cp libxml/patched_libxml_mod.ts libxml/libxml2-xpath/mod.ts
	@echo "[*] Native bindings"
	@cd libxml;../$(DENO) --unstable bench -A ./main.js --no-check
	@echo "[*] Native bindings sandboxed"
	@cd libxml;../$(DENO_WITH_SANDBOX) --unstable bench -A --native-sandbox=../policies/libxml2.json ./main.js --no-check
	@echo "[*] WASM bindings"
	@cd libxml;../$(DENO_WITH_SANDBOX) --unstable bench -A ./main_wasm.ts --no-check

opus:
	@echo "[*] Opus benchmark"
	@sed -i -e "s/<PATH_TO_OPUS>/$(shell pwd | sed -e 's~/~\\\/~g')\/opus/g" policies/libopusenc.json
	@echo "[*] Native bindings"
	@cd opus;../$(DENO) --unstable bench -A ./main.js --no-check
	@echo "[*] Native bindings sandboxed"
	@cd opus;../$(DENO_WITH_SANDBOX) --unstable bench -A ./main.js --native-sandbox=../policies/libopusenc.json --no-check
	@echo "[*] WASM bindings"	
	@cd opus;../$(DENO_WITH_SANDBOX) --unstable bench -A ./main_wasm.ts --no-check

opus-macro-wrk:
	@sed -i -e "s/<PATH_TO_OPUS>/$(shell pwd | sed -e 's~/~\\\/~g')\/opus/g" policies/libopusenc_unpriv.json
	@$(MAKE) _add_network_emulation
	@echo "[*] Running wrk opus benchmark (wrk) ..."
	@$(MAKE) _start-server-opus SCRIPT_NAME=main_server.js
	@cd opus; wrk -t4 -c4 -d30s -s ./wrk/configure_requests.lua --timeout 5s http://localhost:5000
	@$(MAKE) _stop-server-opus
	@echo "[*] Running wrk native sandbox opus benchmark (wrk) ..."
	@$(MAKE) _start-server-opus-sandboxed
	@cd opus; wrk -t4 -c4 -d30s -s ./wrk/configure_requests.lua --timeout 5s http://localhost:5000
	@$(MAKE) _stop-server-opus
	@echo "[*] Running wrk WASM opus benchmark (wrk) ..."
	@$(MAKE) _start-server-opus SCRIPT_NAME=main_server_wasm.ts
	@cd opus; wrk -t4 -c4 -d30s -s ./wrk/configure_requests.lua --timeout 5s http://localhost:5000
	@$(MAKE) _remove_network_emulation
	@$(MAKE) _stop-server-opus

libpng:
	@echo "[*] Libpng benchmark"
	@sed -i -e "s/<PATH_TO_BENCH>/$(shell pwd | sed -e 's~/~\\\/~g')/g" policies/libpng.json
	@echo "[*] Native bindings"
	@cd libpng;../$(DENO) --unstable bench -A ./main_bench.js --no-check
	@echo "[*] Native bindings sandboxed"
	@cd libpng;../$(DENO_WITH_SANDBOX) --unstable bench -A ./main_bench.js --native-sandbox=../policies/libpng.json --no-check
	@echo "[*] WASM bindings"
	@cd libpng;../$(DENO_WITH_SANDBOX) --unstable bench -A ./main_wasm_bench.ts --no-check

libpng-macro-wrk:
	@sed -i -e "s/<PATH_TO_BENCH>/$(shell pwd | sed -e 's~/~\\\/~g')/g" policies/libpng_server.json
	@$(MAKE) _add_network_emulation
	@echo "[*] Running wrk libpng benchmark (wrk) ..."
	@$(MAKE) _start-server-libpng SCRIPT_NAME=main_server.js
	@cd libpng; wrk -t4 -c4 -d30s -s ./wrk/configure_requests.lua --timeout 5s http://localhost:5000
	@$(MAKE) _stop-server-libpng
	@sleep 1
	@echo "[*] Running wrk native sandbox libpng benchmark (wrk) ..."
	@$(MAKE) _start-server-libpng-sandboxed 
	@cd libpng; wrk -t4 -c4 -d30s -s ./wrk/configure_requests.lua --timeout 5s http://localhost:5000
	@$(MAKE) _stop-server-libpng
	@sleep 1
	@echo "[*] Running wrk WASM libpng benchmark (wrk) ..."
	@$(MAKE) _start-server-libpng SCRIPT_NAME=main_server_wasm.ts
	@cd libpng; wrk -t4 -c4 -d30s -s ./wrk/configure_requests.lua --timeout 5s http://localhost:5000
	@$(MAKE) _remove_network_emulation
	@$(MAKE) _stop-server-libpng
