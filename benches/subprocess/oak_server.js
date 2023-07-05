import * as path from "https://deno.land/std@0.161.0/path/mod.ts";

import { Application, FlashServer } from "https://deno.land/x/oak/mod.ts";
import { emptyDir, exists } from "https://deno.land/std@v0.161.0/fs/mod.ts";
import { nanoid } from "https://deno.land/x/nanoid@v3.0.0/mod.ts";

const UPLOAD_PATH = path.resolve("data/upload")

const app = new Application(/* { serverConstructor: FlashServer } */);

app.addEventListener("listen", ({ hostname, port, secure }) => {
    console.log(
        `Listening on ${secure ? "https://" : "http://"}${
            hostname ??
            "localhost"
        }:${port}`,
    );
});
  
app.use(async (ctx) => {
    // Parse incoming request
    const body = await ctx.request.body({ type: "form-data" });

    // Option 1: Use oak default behavior to store incoming file
    // It suffers huge performance degradation with an average latency of
    // 900 ms and a throughput of 4.4 rps

    // const formData = await body.value.read({ outPath: UPLOAD_PATH });

    // // Resolve input and ouput template
    // const inputFilePath = formData.files[0].filename;
    // const outputFilePath =
    //     UPLOAD_PATH + '/output-' + path.basename(inputFilePath);
    // const command_with_io = eval('`' + formData.fields.command + '`');

    // Option 2: Keep incoming file in memory and store it later
    // It highly improves performance with an average latency of 390 ms and a
    // throughput of 10.3 rps

    const formData = await body.value.read({ maxSize: 10**6 });

    // Resolve input and ouput template
    const inputFilePath = UPLOAD_PATH + '/' + nanoid(20);
    const outputFilePath = UPLOAD_PATH + '/' + nanoid(20);
    const command_with_io = eval('`' + formData.fields.command + '`');

    // Store input file
    await Deno.writeFile(inputFilePath, formData.files[0].content);

    // Create dummy output file
    await Deno.create(outputFilePath);

    // Execute requested command
    let subprocess = Deno.run({
        cmd: command_with_io.split(' '),
        stderr: "null",
    });
    await subprocess.status();
    subprocess.close();

    // Support Tesseract naming of the output file
    let actualOutputFilePath = outputFilePath;
    if (!await exists(outputFilePath)) {
        actualOutputFilePath += ".txt";
    }

    // Option 1: Encode entire image in the response
    // With the current size of the image, it improves performance with an
    // average latency of 360 ms and a throughput of 11 rps
    const outputFileContent = await Deno.readFile(actualOutputFilePath);

    // Respond with the result of the execution
    ctx.response.body = outputFileContent;

    // // Option 2: Stream image content
    // // With the current size of the image, it suffers in performance with
    // // an average latency of 390 ms and a throughput of 10 rps

    // // Build a readable stream so the file doesn't have to be fully loaded
    // // into memory while we send it
    // const outputFile = await Deno.open(actualOutputFilePath);
    // const outputFileStream = outputFile.readable;

    // // Respond with the result of the execution
    // ctx.response.body = outputFileStream;
});

// Clean up upload directory
await emptyDir(UPLOAD_PATH);

await app.listen({ port: 5000 });
