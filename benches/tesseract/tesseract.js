
Deno.bench('tesseract - ocr-sample-1.JPG', async () => {
    let p = Deno.run({cmd: ["tesseract", "--oem", "1", "ocr-sample-1.JPG", "output1"]});
    await p.status();
});


Deno.bench('tesseract - ocr-sample-2.JPG', async () => {
    let p = Deno.run({cmd: ["tesseract", "--oem", "1", "ocr-sample-2.JPG", "output2"]});
    await p.status();
});

Deno.bench('tesseract - ocr-sample-3.JPG', async () => {
    let p = Deno.run({cmd: ["tesseract", "--oem", "1", "ocr-sample-3.JPG", "output3"]});
    await p.status();
});


Deno.bench('tesseract - ocr-sample-4.JPG', async () => {
    let p = Deno.run({cmd: ["tesseract", "--oem", "1", "ocr-sample-4.JPG", "output4"]});
    await p.status();
});


Deno.bench('tesseract - ocr-sample-5.JPG', async () => {
    let p = Deno.run({cmd: ["tesseract", "--oem", "1", "ocr-sample-5.JPG", "output5"]});
    await p.status();
});


Deno.bench('tesseract - ocr-sample-6.JPG', async () => {
    let p = Deno.run({cmd: ["tesseract", "--oem", "1", "ocr-sample-6.JPG", "output6"]});
    await p.status();
});


Deno.bench('tesseract - ocr-sample-7.JPG', async () => {
    let p = Deno.run({cmd: ["tesseract", "--oem", "1", "ocr-sample-7.JPG", "output7"]});
    await p.status();
});

