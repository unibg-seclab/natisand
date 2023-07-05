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
use std::error::Error;
use std::fs::File;
use std::io::BufReader;
use std::path::Path;

use serde::Deserialize;
use strum::EnumCount;

#[derive(Copy, Clone, Debug, Deserialize, EnumCount)]
#[serde(rename_all = "lowercase")]
pub enum PolicyType {
  FFI,
  LIBRARY,
  SUBPROCESS,
}

#[derive(Debug, Deserialize)]
pub struct Policy {
  name: String,
  #[serde(rename = "type")]
  policy_type: Option<PolicyType>,
  pub fs: Option<FsPolicyWrapper>,
  pub ipc: Option<IpcPolicyWrapper>,
  pub net: Option<NetPolicyWrapper>,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum FsPolicyWrapper {
  Boolean(bool),
  FsPolicy(FsPolicy),
}

#[derive(Debug, Deserialize)]
pub struct FsPolicy {
  pub read: Option<FsPolicyInternal>,
  pub write: Option<FsPolicyInternal>,
  pub exec: Option<FsPolicyInternal>,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum FsPolicyInternal {
  Boolean(bool),
  Vector(Vec<String>),
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum IpcPolicyWrapper {
  Boolean(bool),
  IpcPolicy(IpcPolicy),
}

#[derive(Debug, Deserialize)]
pub struct IpcPolicy {
  pub fifo: Option<bool>,
  pub message: Option<bool>,
  pub semaphore: Option<bool>,
  pub shmem: Option<bool>,
  pub signal: Option<bool>,
  pub socket: Option<bool>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(untagged)]
pub enum NetPolicyWrapper {
  Boolean(bool),
  NetPolicy(Vec<NetHostPolicy>),
}

#[derive(Clone, Debug, Deserialize)]
pub struct NetHostPolicy {
  pub ip: u32,
  pub ports: Option<NetPortsWrapper>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(untagged)]
pub enum NetPortsWrapper {
  Boolean(bool),
  NetPorts(Vec<u16>),
}

pub fn read_policy_from_file<P: AsRef<Path>>(
  path: P,
) -> Result<Vec<Policy>, Box<dyn Error>> {
  // Open the file in read-only mode with buffer.
  let file = File::open(path)?;
  let reader = BufReader::new(file);

  // Read contents of the JSON file
  let policies = serde_json::from_reader(reader)?;

  Ok(policies)
}

pub fn get_policy<T>(
  policies: &Vec<Policy>,
  encode_policy: fn(&Policy) -> T,
) -> [HashMap<String, T>; PolicyType::COUNT] {
  let mut specific_policies: [HashMap<String, T>; PolicyType::COUNT] = [
    HashMap::new(), // ffi
    HashMap::new(), // library
    HashMap::new(), // subprocess
  ];

  for policy in policies {
    let mut policy_type_idx = PolicyType::SUBPROCESS as usize;
    if let Some(policy_type) = &policy.policy_type {
      policy_type_idx = *policy_type as usize;
    }

    specific_policies[policy_type_idx]
      .insert(String::from(&policy.name), encode_policy(policy));
  }
  specific_policies
}

pub fn get_specific_policy<'a, T>(
  policy: &'a Vec<HashMap<String, T>>,
  library_name: Option<&String>,
) -> &'a HashMap<String, T> {
  let policy_type_idx = match library_name {
    Some(_library_name) => PolicyType::FFI as usize,
    None => PolicyType::SUBPROCESS as usize,
  };
  &policy[policy_type_idx]
}

pub fn get_ns_name(name: &String, library_name: Option<&String>) -> String {
  let ns = match library_name {
    Some(library_name) => library_name.to_owned() + ":",
    None => String::new(),
  };
  let complete_name = ns + name;
  complete_name
}
