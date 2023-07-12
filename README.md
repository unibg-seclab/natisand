# NatiSand

This repository collects additional material associated with the paper:
[NatiSand: Native Code Sandboxing for JavaScript Runtimes](https://cs.unibg.it/seclab-papers/2023/RAID/natisand.pdf)

## Rationale

Modern runtimes render JavaScript code in a secure and isolated
environment, but when they execute binary programs and shared
libraries, no isolation guarantees are provided. This is an important
limitation, and it affects many popular runtimes including Node.js,
Deno, and Bun.

The paper proposes NatiSand, a component for JavaScript runtimes that
leverages _Landlock_, _eBPF_, and _Seccomp_ to control the filesystem,
Inter-Process Communication (IPC), and network resources available to
binary programs and shared libraries.  NatiSand does not require
changes to the application code and offers to the user an easy
interface.  To demonstrate the effectiveness and efficiency of our
approach we implemented NatiSand and integrated it into Deno, a
modern, security-oriented JavaScript runtime. We also reproduce
vulnerabilities affecting third-party code and show how they can be
mitigated by NatiSand. In the experimental evaluation we analyze the
overhead associated with our approach and compare it with state of the
art code sandboxing solutions.

## Quickstart

1. Initialize all submodules

```bash
git submodule update --init --recursive
 ```
 
2. Clone all submodules

```bash
git pull --recurse-submodules
```

3. Make sure the dependencies required to build V8 are available

4. Build the project

```bash
V8_FROM_SOURCE=1 cargo build --release
```

5. Grant the required file capabilities to the deno executable (the
   required capabilities vary based on the test and the kernel
   version, the following is an example):
   
```bash
sudo setcap cap_dac_override,cap_perfmon,cap_bpf=ep target/release/deno
```

6. Tests
   + Ensure all additional dependencies are installed (e.g., native
     libraries like `sqlite3`, binary programs like `GNU Tar`)
   + Run the tests using `make` or the available Python scripts
