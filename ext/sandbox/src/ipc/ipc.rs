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

use anyhow::Result;
use bincode::deserialize;
use criterion::black_box;
use log::warn;
use seccompiler::sock_filter;
use serde::Deserialize;

use crate::policy::{
  get_ns_name, get_specific_policy, IpcPolicyWrapper, Policy, PolicyType,
};

#[path = "bpf/.output/ipc.skel.rs"]
mod bpf;
use bpf::*;

// Global variable keeping the ipc policy
pub static mut IPC_POLICY: Vec<HashMap<String, u8>> = vec![];

const FIFO: u8 = 0b00000001;
const MESSAGE: u8 = 0b00000010;
const SEMAPHORE: u8 = 0b00000100;
const SHMEM: u8 = 0b00001000;
const SIGNAL: u8 = 0b00010000;
const SOCKET: u8 = 0b00100000;

pub const ALLOW_ALL: u8 = FIFO | MESSAGE | SEMAPHORE | SHMEM | SIGNAL | SOCKET;

const FILTER_TYPES: [&str; 6] =
  ["fifo", "message", "semaphore", "shmem", "signal", "socket"];

/*
 * Ideally use a const variable initialized by import_seccomp_filters, however
 * import_seccomp_filters cannot be declared as a const function due to the
 * for loop (see issue https://github.com/rust-lang/rust/issues/87575)
*/
static mut FILTERS: Vec<HashMap<String, Vec<sock_filter>>> = vec![];

#[derive(Deserialize)]
struct Inst {
  code: std::os::raw::c_ushort,
  jt: std::os::raw::c_uchar,
  jf: std::os::raw::c_uchar,
  k: std::os::raw::c_uint,
}

pub fn import_seccomp_filters() -> Result<()> {
  // Import filters
  let encoded = include_bytes!("./filters.bin");
  let my_filters: HashMap<String, Vec<Inst>> = deserialize(encoded)?;

  // Convert to our deserializable structure to original non-serializable one
  let mut filters: HashMap<String, Vec<sock_filter>> = HashMap::new();
  for (name, my_insts) in my_filters {
    let mut insts = Vec::new();
    for my_inst in my_insts {
      let inst = sock_filter {
        code: my_inst.code,
        jt: my_inst.jt,
        jf: my_inst.jf,
        k: my_inst.k,
      };
      insts.push(inst);
    }
    filters.insert(name, insts);
  }

  unsafe {
    FILTERS.push(filters);
  }

  Ok(())
}

/*
 * Uprobe attachment point
*/
#[no_mangle]
#[inline(never)]
extern "C" fn attach_ipc_policy(policy: u8) {
  black_box(policy);
}

pub fn load_bpf_programs() -> Result<IpcSkel<'static>> {
  let mut skel = IpcSkelBuilder::default().open()?.load()?;
  skel.attach()?;
  Ok(skel)
}

pub fn ipc_policy_encoding(policy: &Policy) -> u8 {
  match &policy.ipc {
    Some(ipc_wrapper) => match ipc_wrapper {
      IpcPolicyWrapper::Boolean(allow) => match allow {
        true => ALLOW_ALL,
        false => 0,
      },
      IpcPolicyWrapper::IpcPolicy(ipc) => {
        let mut to_allow = 0;
        if let Some(fifo) = ipc.fifo {
          if fifo {
            to_allow |= FIFO;
          }
        }
        if let Some(message) = ipc.message {
          if message {
            to_allow |= MESSAGE;
          }
        }
        if let Some(semaphore) = ipc.semaphore {
          if semaphore {
            to_allow |= SEMAPHORE;
          }
        }
        if let Some(shmem) = ipc.shmem {
          if shmem {
            to_allow |= SHMEM;
          }
        }
        if let Some(signal) = ipc.signal {
          if signal {
            to_allow |= SIGNAL;
          }
        }
        if let Some(socket) = ipc.socket {
          if socket {
            to_allow |= SOCKET;
          }
        }

        to_allow
      }
    },
    None => 0,
  }
}

pub fn need_ipc_progs() -> bool {
  unsafe {
    for curr_policies in &IPC_POLICY {
      for (_policy_name, policy) in curr_policies {
        if policy & FIFO == 0 || policy & SOCKET == 0 {
          return true;
        }
      }
    }
  }
  false
}

pub fn get_policy(name: &String, library_name: Option<&String>) -> u8 {
  let full_name = get_ns_name(name, library_name);

  // Do not try to sandbox when no policy is given
  if unsafe { IPC_POLICY.is_empty() } {
    warn!("IPC: {} is running without a sandbox", full_name);
    return ALLOW_ALL;
  }

  let mut to_sandbox = false;
  let mut policy: u8 = 0;
  unsafe {
    let specific_policies = get_specific_policy(&IPC_POLICY, library_name);
    if let Some(specific_policy) = specific_policies.get(&full_name) {
      // Use command or function specific permissions
      to_sandbox = true;
      policy = *specific_policy;
    } else {
      if let Some(library_name) = library_name {
        // Fallback to library permissions
        let library_policies = &IPC_POLICY[PolicyType::LIBRARY as usize];
        if let Some(library_policy) = library_policies.get(library_name) {
          to_sandbox = true;
          policy = *library_policy;
        }
      }
    }
  }

  // Do not sandbox when no policy is given for current command or function
  if !to_sandbox {
    warn!("IPC: {} is running without a sandbox", full_name);
    return ALLOW_ALL;
  }
  policy
}

pub fn sandbox(to_allow: u8) {
  if to_allow != ALLOW_ALL {
    for (i, filter_type) in FILTER_TYPES.iter().enumerate() {
      if to_allow & (1 << i) == 0 {
        unsafe {
          let filter = FILTERS[0].get(*filter_type).unwrap();
          seccompiler::apply_filter(&filter[..]).unwrap();
        }
      }
    }
    attach_ipc_policy(to_allow);
  }
}
