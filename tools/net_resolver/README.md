# Network policy translation

Process the policy file and translate hostnames into IPs

# Prerequisites

+ Go 1.18
+ `jq` to print a formatted version of the translate policy

# Quickstart

+ `make build` build the binary
+ `make` execute the binary with the default input and output arguments
+ `make print` print the example translated policy (formatted with `jq`)

# Usage 

```
[-l|--local-dns] is required
usage: net-translator [-h|--help] [-d|--debug] -l|--local-dns "<value>"
                      [-r|--remote-dns "<value>"] -i|--in "<value>" -o|--out
                      "<value>"

                      Process the policy file and translate hostnames into IPs

Arguments:

  -h  --help        Print help information
  -d  --debug       Enable verbose output
  -l  --local-dns   Missing local DNS, e.g.: 127.0.0.53:53
  -r  --remote-dns  Other DNS resolvers, e.g.: 8.8.8.8:53 8.8.4.4:53
  -i  --in          Input policy file
  -o  --out         Output policy files

```
```
go run main.go  --local-dns "127.0.0.53:53" --remote-dns "8.8.8.8:53 8.8.4.4:53" --in policy.json --out translated_policy.json
```
