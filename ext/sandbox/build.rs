// Copyright (c) 2023 Unibg Seclab (https://seclab.unibg.it)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
// the Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
// FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
// COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
// IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
// CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

use std::collections::HashMap;
use std::env;
use std::fs::create_dir_all;
use std::fs::File;
use std::io::Write;
use std::process::Command;

use libbpf_cargo::SkeletonBuilder;
use seccompiler::{compile_from_json, TargetArch};
use serde::Serialize;

#[derive(Serialize)]
struct Inst {
  code: std::os::raw::c_ushort,
  jt: std::os::raw::c_uchar,
  jf: std::os::raw::c_uchar,
  k: std::os::raw::c_uint,
}

fn generate_seccomp_filters() -> Result<(), Box<dyn std::error::Error>> {
  // Rerun build script when filters change.
  println!("cargo:rerun-if-changed=./src/ipc/filters.json");

  // Retrieve target architecture
  let target_arch = match &env::var("CARGO_CFG_TARGET_ARCH")?[..] {
    "x86_64" => Ok(TargetArch::x86_64),
    "aarch64" => Ok(TargetArch::aarch64),
    _ => Err("arch not supported"),
  };

  let filters =
    compile_from_json(File::open("./src/ipc/filters.json")?, target_arch?)?;

  // Convert non-serializable struct to our serializable one
  let mut my_filters: HashMap<String, Vec<Inst>> = HashMap::new();
  for (name, insts) in filters {
    let mut my_insts = Vec::new();
    for inst in insts {
      let my_inst = Inst {
        code: inst.code,
        jt: inst.jt,
        jf: inst.jf,
        k: inst.k,
      };
      my_insts.push(my_inst);
    }
    my_filters.insert(name, my_insts);
  }

  // Store filters in binary format
  let encoded: Vec<u8> = bincode::serialize(&my_filters)?;
  let mut output = File::create("./src/ipc/filters.bin")?;
  output.write_all(&encoded[..])?;

  Ok(())
}

fn generate_kernel_defs() -> Result<(), Box<dyn std::error::Error>> {
  // Generate kernel definitions
  let mut cmd = Command::new("bpftool");
  cmd
    .arg("btf")
    .arg("dump")
    .arg("file")
    .arg("/sys/kernel/btf/vmlinux")
    .arg("format")
    .arg("c");
  let output = cmd.output().expect("Failed to run command");

  // Save the definitions to file
  let mut f = File::create("./src/ipc/bpf/vmlinux.h")?;
  f.write_all(&output.stdout)?;

  // Save the definitions to file
  let mut f = File::create("./src/net/bpf/vmlinux.h")?;
  f.write_all(&output.stdout)?;

  Ok(())
}

const SRC_IPC: &str = "./src/ipc/bpf/ipc.bpf.c";
const SRC_NET: &str = "./src/net/bpf/net.bpf.c";

fn generate_skeleton() -> Result<(), Box<dyn std::error::Error>> {
  let build_profile = env::var("PROFILE")?;
  let arg = match &build_profile[..] {
    "debug" => "-DDEBUG",
    _ => "",
  };

  create_dir_all("./src/ipc/bpf/.output")?;
  SkeletonBuilder::new()
    .source(SRC_IPC)
    .clang_args(arg)
    .build_and_generate("./src/ipc/bpf/.output/ipc.skel.rs")?;
  println!("cargo:rerun-if-changed={}", SRC_IPC);

  create_dir_all("./src/net/bpf/.output")?;

  SkeletonBuilder::new()
    .source(SRC_NET)
    .clang_args(arg)
    .build_and_generate("./src/net/bpf/.output/net.skel.rs")?;
  println!("cargo:rerun-if-changed={}", SRC_NET);

  Ok(())
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
  generate_seccomp_filters()?;
  generate_kernel_defs()?;
  generate_skeleton()?;
  Ok(())
}
