.PHONY: all clean run test print

APP            := main.go
BINARY	       := net-translator

LDNS	:= "127.0.0.53:53"
ODNS	:= "8.8.8.8:53 8.8.4.4:53"
IN	:= policy.json
OUT	:= translated_policy.json
DEBUG :=

all: run

clean:
	@ rm -f $(OUT)
	@ rm -f $(BINARY)
	@ find . -iname '*~' -exec rm {} \;

test:
	@ go test ./... -count=1

build:
	@ go build -o $(BINARY) $(APP)

run: build
	@ $(BINARY) $(DEBUG) --local-dns $(LDNS) --remote-dns $(ODNS) --in $(IN) --out $(OUT)

print:
	@ cat $(OUT) | jq
