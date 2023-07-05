Deno.run({cmd: ["gpg", "-c", "--no-options", "--batch", "--yes", "--passphrase-file", "./passphrase", "-o", "/dev/null", "./file_to_encrypt"]});

Deno.bench('GPG encryption', async () => {
    let p = Deno.run({cmd: ["gpg", "-c", "--no-options", "--batch", "--yes", "--passphrase-file", "./passphrase", "-o", "/dev/null", "./file_to_encrypt"]});
    await p.status();
});
