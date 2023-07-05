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

use std::env;
use std::fs;
use std::{io::BufRead, io::BufReader};

use anyhow::Result;
use lazy_static::lazy_static;
use regex::Regex;

pub fn is_lsm_available(lsm: &str) -> Result<bool> {
  let lsm_file = fs::File::open("/sys/kernel/security/lsm")?;
  let mut line = String::new();
  let _len = BufReader::new(lsm_file).read_line(&mut line);

  Ok(line.contains(lsm))
}

pub fn has_necessary_capability() -> Result<bool> {
  let has_cap_dac_override = caps::has_cap(
    None,
    caps::CapSet::Permitted,
    caps::Capability::CAP_DAC_OVERRIDE,
  )?;
  let has_cap_perfmon = caps::has_cap(
    None,
    caps::CapSet::Permitted,
    caps::Capability::CAP_PERFMON,
  )?;
  let has_cap_bpf =
    caps::has_cap(None, caps::CapSet::Permitted, caps::Capability::CAP_BPF)?;

  Ok(has_cap_dac_override && has_cap_perfmon && has_cap_bpf)
}

pub fn resolve_env_vars(input: &String) -> String {
  // Compile regex only once
  lazy_static! {
    static ref ENV_VAR_REGEX: Regex = Regex::new(r"\$\w+").unwrap();
  }

  let mut pos = 0;
  let mut output = String::new();

  for mat in ENV_VAR_REGEX.find_iter(input) {
    let name = &mat.as_str()[1..]; // skip $ sign
    // TODO: Log error with environment variable resolution
    let value = env::var(name).unwrap_or(String::new());

    let from = pos;
    let to = mat.start();
    output += &input[from..to]; // append unmatched prefix
    output += &value;           // append value of env variable
    pos = mat.end();
  }
  output += &input[pos..];      // append unmatched suffix

  output
}
