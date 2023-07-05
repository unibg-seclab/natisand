#!/bin/bash
#
# Generate native sandbox policy and necessary to sandbox a command using our
# Deno native sandboxing extension

usage() {
    echo -e "Usage: $0 COMMAND OUTPUT \n"
    echo -e "OPERANDS:"
    echo -e "  COMMAND \t command to trace"
    echo -e "  OUTPUT \t output file \n"
    echo -e "OPTIONS:"
    echo -e "  -i \t\t allow IPC"
    echo -e "  -n \t\t allow networking"
    echo -e "NOTE: Requires system-wide installation of dmng"
}

# Reset POSIX variable in case getopts has been already used
OPTIND=1

ipc=''
net=''

# Parse options
while getopts "h?in" opt; do
  case "$opt" in
    h|\?)
      usage
      exit 0
      ;;
    i)  ipc='-i'
      ;;
    n)  net='-n'
      ;;
  esac
done

shift $((OPTIND-1))

[ "${1:-}" = "--" ] && shift

# Make sure there are exactly 2 operands
if [ $# -ne 2 ]; then
    usage
fi

command=$1
output=$2

# Clean dmng database
dmng --wipe

binary_path=(${command})
context=$(basename ${binary_path})

dmng --command "${command}" --setcontext ${context}

# Trace command
dmng --command "${command}" --trace
dmng --command "${command}" --trace --simulate 5

# Produce native sandbox policy
dmng --serialize command_policy.json
parent=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
"${parent}/to_native_sandbox_policy.py" ${ipc} ${net} \
"$HOME/.cage4denos_profiles/command_policy.json" ${output}
rm ~/.cage4denos_profiles/command_policy.json
