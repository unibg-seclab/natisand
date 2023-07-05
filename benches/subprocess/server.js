import * as path from "https://deno.land/std@0.161.0/path/mod.ts";

import { emptyDir, exists } from "https://deno.land/std@v0.161.0/fs/mod.ts";
import { nanoid } from "https://deno.land/x/nanoid@v3.0.0/mod.ts";

const PORT = 5000;
const UPLOAD_PATH = path.resolve("data/upload");

async function handler(request) {
    // Parse incoming request
    const data = await request.formData();
    const command = data.get("command");
    const file = data.get("file");

    // Resolve input and ouput template
    const inputFilePath = UPLOAD_PATH + '/' + nanoid(20);
    const outputFilePath = UPLOAD_PATH + '/' + nanoid(20);
    const command_with_io = eval('`' + command + '`');

    // Store input file
    const inputFileContent = new Uint8Array(await file.arrayBuffer());
    await Deno.writeFile(inputFilePath, inputFileContent);

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
    // average latency of 74 ms and a throughput of 55 rps
    const outputFileContent = await Deno.readFile(actualOutputFilePath);

    // Respond with the result of the execution
    return new Response(outputFileContent);

    // Option 2: Stream image content
    // With the current size of the image, it suffers in performance with
    // an average latency of 114 ms and a throughput of 35 rps

    // Build a readable stream so the file doesn't have to be fully loaded
    // into memory while we send it
    // const outputFile = await Deno.open(actualOutputFilePath);
    // const outputFileStream = outputFile.readable;

    // // Respond with the result of the execution
    // return new Response(outputFileStream);
}

// Clean up upload directory
await emptyDir(UPLOAD_PATH);

// Start listening on localhost.
const server = Deno.listen({ port: PORT });
console.log(`Listening on http://localhost:${PORT}/`);

// Connections to the server will be yielded up as an async iterable.
for await (const conn of server) {
  // In order to not be blocking, we need to handle each connection individually
  // without awaiting the function
  serveHttp(conn);
}

async function serveHttp(conn) {
  // This "upgrades" a network connection into an HTTP connection.
  const httpConn = Deno.serveHttp(conn);
  // Each request sent over the HTTP connection will be yielded as an async
  // iterator from the HTTP connection.
  for await (const requestEvent of httpConn) {
    // The requestEvent's `.respondWith()` method is how we send the response
    // back to the client.
    await requestEvent.respondWith(handler(requestEvent.request));
  }
}
