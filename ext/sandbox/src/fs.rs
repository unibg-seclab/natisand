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

use landlock::{
  make_bitflags, path_beneath_rules, Access, AccessFs, BitFlags, Ruleset,
  RulesetStatus, ABI,
};
use log::warn;

use crate::policy::{
  get_ns_name, get_specific_policy, FsPolicyInternal, FsPolicyWrapper, Policy,
  PolicyType,
};
use crate::utils::resolve_env_vars;

// Global variable keeping the file system policy
pub static mut FS_POLICY: Vec<HashMap<String, RWX>> = vec![];

const ACCESS_FS_ROUGHLY_READ: BitFlags<AccessFs> = make_bitflags!(AccessFs::{
    ReadFile | ReadDir});

const ACCESS_FS_ROUGHLY_WRITE: BitFlags<AccessFs> = make_bitflags!(AccessFs::{
    WriteFile | RemoveDir | RemoveFile | MakeChar | MakeDir | MakeReg | MakeSock | MakeFifo |
        MakeBlock | MakeSym
});

const ACCESS_FS_EXEC: BitFlags<AccessFs> = make_bitflags!(AccessFs::{Execute});

pub struct RWX {
  read: Vec<String>,
  write: Vec<String>,
  exec: Vec<String>,
}

impl RWX {
  fn allow() -> RWX {
    RWX {
      read: vec![String::from("/")],
      write: vec![String::from("/")],
      exec: vec![String::from("/")],
    }
  }

  fn deny() -> RWX {
    RWX {
      read: vec![],
      write: vec![],
      exec: vec![],
    }
  }
}

fn get_paths(opt_internal: &Option<FsPolicyInternal>) -> Vec<String> {
  match &opt_internal {
    Some(internal) => match internal {
      FsPolicyInternal::Boolean(allow) => match allow {
        true => vec![String::from("/")],
        false => vec![],
      },
      FsPolicyInternal::Vector(paths) => paths
        .iter()
        .map(resolve_env_vars)
        .collect(),
    },
    None => vec![],
  }
}

pub fn fs_policy_encoding(policy: &Policy) -> RWX {
  match &policy.fs {
    Some(fs_wrapper) => match fs_wrapper {
      FsPolicyWrapper::Boolean(allow) => match allow {
        true => RWX::allow(),
        false => RWX::deny(),
      },
      FsPolicyWrapper::FsPolicy(fs) => RWX {
        read: get_paths(&fs.read),
        write: get_paths(&fs.write),
        exec: get_paths(&fs.exec),
      },
    },
    None => RWX::deny(),
  }
}

// Return true when Landlock rules are enforced
pub fn enforce_landlock(name: &String, library_name: Option<&String>) -> bool {
  let full_name = get_ns_name(name, library_name);

  // Do not try to sandbox when no policy is given
  if unsafe { FS_POLICY.is_empty() } {
    warn!("FS: {} is running without a sandbox", full_name);
    return false;
  }

  let mut to_sandbox = false;
  let mut read = &Vec::new();
  let mut write = &Vec::new();
  let mut exec = &Vec::new();
  unsafe {
    let specific_policies = get_specific_policy(&FS_POLICY, library_name);
    if let Some(vec) = specific_policies.get(&full_name) {
      // Use command or function specific permissions
      to_sandbox = true;
      read = &vec.read;
      write = &vec.write;
      exec = &vec.exec;
    } else {
      if let Some(library_name) = library_name {
        // Fallback to library permissions
        let library_policies = &FS_POLICY[PolicyType::LIBRARY as usize];
        if let Some(vec) = library_policies.get(library_name) {
          to_sandbox = true;
          read = &vec.read;
          write = &vec.write;
          exec = &vec.exec;
        }
      }
    }
  }

  // Do not sandbox when no policy is given for current command or function
  if !to_sandbox {
    warn!("FS: {} is running without a sandbox", full_name);
    return to_sandbox;
  }

  // Sandbox when policy is given for current command or function
  let status = Ruleset::new()
    .handle_access(AccessFs::from_all(ABI::V2))
    .unwrap()
    .create()
    .unwrap()
    .add_rules(path_beneath_rules(read, ACCESS_FS_ROUGHLY_READ))
    .unwrap()
    .add_rules(path_beneath_rules(write, ACCESS_FS_ROUGHLY_WRITE))
    .unwrap()
    .add_rules(path_beneath_rules(exec, ACCESS_FS_EXEC))
    .unwrap()
    .restrict_self()
    .expect("FS: Failed to enforce sandbox");

  assert!(status.ruleset != RulesetStatus::NotEnforced);
  if status.ruleset == RulesetStatus::PartiallyEnforced {
    warn!("FS: partial enforcement of the sandbox");
  }
  
  to_sandbox
}
