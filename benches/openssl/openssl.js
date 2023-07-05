Deno.run({cmd: ["openssl", "speed", "rsa4096"]});

Deno.bench('openssl speed', async () => {
    let p = Deno.run({cmd: ["openssl", "speed", "rsa4096"]});
    await p.status();
});
