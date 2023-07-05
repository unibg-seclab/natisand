import * as path from "https://deno.land/std@0.159.0/path/mod.ts";

const SANDBOX2 = "../bazel-bin/subprocess/sandbox2/sandboxer";

async function run(runArgs, stdinPath) {
    let subprocess = Deno.run(runArgs);

    if (runArgs.stdin == "piped") {
        if (!stdinPath) {
            throw "Unspecified path with piped stdin";
        }

        // Write contents of the file to stdin
        await Deno.writeAll(subprocess.stdin, await Deno.readFile(stdinPath));
        subprocess.stdin.close();
    }

    await subprocess.status();
    subprocess.close();
}

const testsPath = Deno.args[0];
const tests = JSON.parse(await Deno.readTextFile(testsPath));
for (const test of tests) {
    const { command, dependencies: depPaths, seccomp, stdin: stdinPath } = test;
    const utility = command[0];

    // Resolve relative paths in command arguments
    for (let i = 0; i < command.length; i++) {
        const arg = command[i];
        if (arg.startsWith("data/") || arg.startsWith("../")) {
            command[i] = path.resolve(arg);
        }
    }

    // Prepare native sandbox
    await run({
        cmd: command,
        ...(stdinPath && {stdin: "piped"}),
        stderr: "null",
        stdout: "null",
    }, stdinPath);

    Deno.bench({
        name: `coreutils (${utility}) - default`,
        group: utility,
        baseline: true,
        permissions: {
            ...(stdinPath && {read: [stdinPath]}),
            run: [utility]
        },
        fn: async () => await run({
            cmd: command,
            ...(stdinPath && {stdin: "piped"}),
            stderr: "null",
            stdout: "null",
        }, stdinPath)
    });

    // Keep track of absolute path arguments
    // NOTE: Do NOT use relative paths
    let paths = [];
    for (let i = 0; i < command.length; i++) {
        let arg = command[i];
        let pos = arg.indexOf('/');
        if (pos != -1 && arg.indexOf("https://") == -1) {
            paths.push(arg.substring(pos));
        }
    }

    Deno.bench({
        name: `coreutils (${utility}) - minijail`,
        group: utility,
        permissions: {
            ...(stdinPath && {read: [stdinPath]}),
            run: ["sudo"]
        },
        fn: async () => await run({
            cmd: [
                "sudo",
                "minijail0",
                "-C",
                "minijail-root",
                // Command arguments
                ...paths.map((path) => `--bind-mount=${path}`),
                // Additional dependencies
                ...(depPaths ? depPaths.map((path) => `--bind-mount=${path}`) : []),
                `--seccomp-bpf-binary=${seccomp}`,
                "--",
                ...command
            ],
            ...(stdinPath && {stdin: "piped"}),
            // NOTE: Redirection requires access to ioctl syscall
            stderr: "null",
            stdout: "null",
        }, stdinPath)
    });

    Deno.bench({
        name: `coreutils (${utility}) - sandbox2`,
        group: utility,
        permissions: {
            ...(stdinPath && {read: [stdinPath]}),
            run: [SANDBOX2]
        },
        fn: async () => await run({
            cmd: [
                SANDBOX2,
                // Additional dependencies
                ...(depPaths ? [`--deps=${depPaths.join(',')}`] : []),
                "--",
                ...command
            ],
            ...(stdinPath && {stdin: "piped"}),
            // NOTE: Redirection requires access to ioctl syscall
            stderr: "null",
            stdout: "null",
        }, stdinPath)
    });
}
