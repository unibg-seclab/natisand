#!/bin/bash
#
# Generate seccomp policy and bpf binary necessary to sandbox a command using
# Minijail sandboxing and containment tool

usage() {
    echo -e "Usage: $0 COMMAND OUTPUT \n"
    echo -e "OPERANDS:"
    echo -e "  COMMAND \t command to trace"
    echo -e "  OUTPUT \t prefix of the output files \n"
    echo -e "NOTE: Run this script inside the Minijail repository root"
}

if [ $# -ne 2 ]; then
    usage
fi

command=$1
output=$2

# Generate necessary constants.json file
make minijail0 constants.json > /dev/null 2>&1

# Trace command syscalls
strace -f -e raw=all -o "${output}.strace" -- ${command}

# Generate seccomp policy
./tools/generate_seccomp_policy.py "${output}.strace" > "${output}.policy"

echo "# Additional policy adjustements" >> "${output}.policy"
# Adjust policy to support Deno output redirection
grep -q "^ioctl:" "${output}.policy" ||
echo "ioctl: arg1 == 0x5401" >> "${output}.policy"
# Adjust policy to support convert
grep -q "^getcwd:" "${output}.policy" || echo "getcwd: 1" >> "${output}.policy"
grep -q "^readlink:" "${output}.policy" || echo "readlink: 1" >> "${output}.policy"
# Adjust policy to support ls
grep -q "^stat:" "${output}.policy" || echo "stat: 1" >> "${output}.policy"
# Adjust policy to support shuf
grep -q "^getpid:" "${output}.policy" || echo "getpid: 1" >> "${output}.policy"
grep -q "^getppid:" "${output}.policy" || echo "getppid: 1" >> "${output}.policy"
grep -q "^getuid:" "${output}.policy" || echo "getuid: 1" >> "${output}.policy"
grep -q "^getgid:" "${output}.policy" || echo "getgid: 1" >> "${output}.policy"
# Adjust policy to support tesseract
grep -q "^clock_gettime:" "${output}.policy" || echo "clock_gettime: 1" >> "${output}.policy"

# Compile seccomp policy
./tools/compile_seccomp_policy.py "${output}.policy" "${output}.bpf"
