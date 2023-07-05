import * as path from "https://deno.land/std@0.159.0/path/mod.ts";

const SANDBOX2 = "../bazel-bin/subprocess/sandbox2/sandboxer";

function getBenchmarkFilename(name, category) {
    const base = name
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()\s]/g, "-");
    const complete = base + "-" + category + ".json";
    return complete.replace(/-{2,}/g, "-");
}

// Create configs directory
Deno.mkdirSync("configs", { recursive: true });

const tests = JSON.parse(Deno.readTextFileSync("../server_tests.json"));
for (const test of tests) {
    let { name, command, dependencies: depPaths, image, seccomp } = test;

    // Resolve relative paths in the tests
    for (let i = 0; i < depPaths.length; i++) {
        if (depPaths[i].startsWith("data/")) {
            depPaths[i] = path.resolve("../" + depPaths[i]);
        }
    }
    image = path.resolve("../" + image);

    const default_filename = getBenchmarkFilename(name, "default");
    const default_command = command.join(' ');
    Deno.writeTextFileSync("configs/" + default_filename, JSON.stringify({
        command: default_command,
        file: image,
        benchmark_output: default_filename,
    }));

    const minijail_filename = getBenchmarkFilename(name, "minijail");
    const minijail_command = [
        "sudo",
        "minijail0",
        "-C",
        "minijail-root",
        // Additional dependencies
        ...(depPaths ? depPaths.map((path) => `--bind-mount=${path},${path},1`) : []),
        `--seccomp-bpf-binary=${seccomp}`,
        "--",
        ...command
    ].join(' ');
    Deno.writeTextFileSync("configs/" + minijail_filename, JSON.stringify({
        command: minijail_command,
        file: image,
        benchmark_output: minijail_filename,
    }));

    const sandbox2_filename = getBenchmarkFilename(name, "sandbox2");
    const sandbox2_command = [
        SANDBOX2,
        // Additional dependencies
        ...(depPaths ? [`--deps=${depPaths.join(',')}`] : []),
        "--",
        ...command
    ].join(' ');
    Deno.writeTextFileSync("configs/" + sandbox2_filename, JSON.stringify({
        command: sandbox2_command,
        file: image,
        benchmark_output: sandbox2_filename,
    }));
}
