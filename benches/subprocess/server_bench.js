import * as path from "https://deno.land/std@0.159.0/path/mod.ts";

const SANDBOX2 = "../bazel-bin/subprocess/sandbox2/sandboxer";
const TEST_SERVER_URL = "http://localhost:5000";

async function sendRequest(command, filePath) {
    const formData = new FormData();
    formData.set("command", command);
    const bytes = Deno.readFileSync(filePath);
    formData.set("file", new File([bytes], "sample-image.jpg"));
    await fetch(TEST_SERVER_URL, { method: "POST", body: formData });
}

const testsPath = Deno.args[0];
const tests = JSON.parse(await Deno.readTextFile(testsPath));
for (const test of tests) {
    let { name, command, dependencies: depPaths, image, seccomp } = test;

    // Resolve relative paths in the tests
    for (let i = 0; i < depPaths.length; i++) {
        if (depPaths[i].startsWith("data/")) {
            depPaths[i] = path.resolve(depPaths[i]);
        }
    }
    image = path.resolve(image);

    const default_command = command.join(' ');

    // Prepare native sandbox
    await sendRequest(default_command, image);

    Deno.bench({
        name: `${name} - default`,
        group: name,
        baseline: true,
        fn: async () => await sendRequest(default_command, image)
    });

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

    Deno.bench({
        name: `${name} - minijail`,
        group: name,
        fn: async () => await sendRequest(minijail_command, image)
    });

    const sandbox2_command = [
        SANDBOX2,
        // Additional dependencies
        ...(depPaths ? [`--deps=${depPaths.join(',')}`] : []),
        "--",
        ...command
    ].join(' ');

    Deno.bench({
        name: `${name} - sandbox2`,
        group: name,
        fn: async () => await sendRequest(sandbox2_command, image)
    });
}
