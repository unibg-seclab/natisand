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

pub mod fs;
#[path = "ipc/ipc.rs"]
pub mod ipc;
#[path = "net/net.rs"]
pub mod net;

pub mod policy;
mod utils;

use anyhow::{anyhow, Result};
use std::sync::Arc;
use std::sync::Barrier;

use ipc::{import_seccomp_filters, need_ipc_progs};
use utils::{has_necessary_capability, is_lsm_available};

pub fn import_requirements() -> Result<()> {
  import_seccomp_filters().expect("Error importing seccomp filters");

  if !is_lsm_available("landlock")? {
    return Err(anyhow!("No Landlock support available"));
  }

  let ipc = need_ipc_progs();
  let net = true;

  if !ipc && !net {
    // Drop permitted capabilities
    caps::clear(None, caps::CapSet::Permitted)?;

    return Ok(());
  }

  // if !is_lsm_available("bpf")? {
  //   return Err(anyhow!("No LSM BPF support available"));
  // }

  if !has_necessary_capability()? {
    return Err(anyhow!(
      "Missing necessary capability (CAP_BPF, CAP_DAC_OVERRIDE, CAP_PERFMON)"
    ));
  }

  let barrier = Arc::new(Barrier::new(2));
  let child_barrier = Arc::clone(&barrier);

  std::thread::spawn(move || -> Result<()> {
    // Load bpf programs

    let mut _skel_ipc;
    if ipc {
      _skel_ipc = crate::ipc::load_bpf_programs()
        .expect("Error loading ipc bpf programs");
    }

    let mut _skel_net;
    if net {
      _skel_net = crate::net::load_bpf_programs_and_maps()
        .expect("Error loading net bpf programs");
    }

    // Notify outer thread of the loading
    child_barrier.wait();

    // Keep thread around to avoid unloading of bpf programs
    loop {
      std::thread::park();
    }
  });

  // Wait loading of bpf programs
  barrier.wait();

  // Drop permitted capabilities
  caps::clear(None, caps::CapSet::Permitted)?;

  Ok(())
}

// Returns true if at least one policy component is applied
pub fn apply(name: &String, library_name: Option<&String>) -> bool {
  let is_sandboxed;
  let fs_sandboxed = fs::enforce_landlock(name, library_name);

  let filters_to_enable = ipc::get_policy(name, library_name);
  let ipc_sandboxed =  filters_to_enable != ipc::ALLOW_ALL;
  ipc::sandbox(filters_to_enable);

  let net_sandboxed;
  if let Ok(net_policy_id) = net::get_policy(name, library_name) {
    net::attach_net_policy(net_policy_id);
    net_sandboxed = true;
  } else {
    net_sandboxed = false;
  }

  is_sandboxed = fs_sandboxed || ipc_sandboxed || net_sandboxed;
  is_sandboxed

}
