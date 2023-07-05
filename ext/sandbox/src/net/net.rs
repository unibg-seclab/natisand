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

use anyhow::{anyhow, Result};
use criterion::black_box;
use libbpf_rs::libbpf_sys::{
  bpf_create_map, bpf_map_update_elem, BPF_ANY, BPF_MAP_TYPE_HASH,
};
use libc::c_void;
use log::warn;
use nix;

use crate::policy::{
  get_ns_name, NetPolicyWrapper, NetPortsWrapper, Policy, PolicyType,
};

// do not edit: auto-generated skeleton
// do not edit: auto-generated skeleton config
#[path = "bpf/.output/net.skel.rs"]
mod network;
use network::*;

// Global variable keeping the file system policy
pub static mut NET_POLICY: Vec<
  HashMap<String, Option<HashMap<u32, Vec<u16>>>>,
> = vec![];

// Global variable keeping the mapping from (name, type) to pol_id
pub static mut POLICY_MAPPING: Vec<HashMap<(String, usize), i32>> = vec![];

// used as key to lookup the network rules in the policy
#[repr(C)]
struct connection_e {
  port: u16,
  filler: u16,
  addr_32: u32,
}

/*
 * Uprobe attachment point
*/
#[no_mangle]
#[inline(never)]
pub extern "C" fn attach_net_policy(pol_id: i32) {
  black_box(pol_id);
}

pub fn get_ports(opt_port_wrapper: &Option<NetPortsWrapper>) -> Vec<u16> {
  match opt_port_wrapper {
    Some(port_wrapper) => match port_wrapper {
      NetPortsWrapper::Boolean(allow) => match allow {
        true => vec![0],
        false => vec![],
      },
      NetPortsWrapper::NetPorts(ports) => ports.to_owned(),
    },
    None => vec![0],
  }
}

pub fn net_policy_encoding(policy: &Policy) -> Option<HashMap<u32, Vec<u16>>> {
  match &policy.net {
    Some(net_wrapper) => match net_wrapper {
      NetPolicyWrapper::Boolean(allow) => match allow {
        true => None,
        false => Some(HashMap::new()),
      },
      NetPolicyWrapper::NetPolicy(net_policy) => {
        let mut net_hosts: HashMap<u32, Vec<u16>> = HashMap::new();
        for net_host_policy in net_policy {
          let key = net_host_policy.ip;
          let value = get_ports(&net_host_policy.ports);
          net_hosts.insert(key, value);
        }
        Some(net_hosts)
      }
    },
    None => Some(HashMap::new()),
  }
}

fn ref_to_voidp<T>(r: &T) -> *const c_void {
  r as *const T as *const c_void
}

// end map configuration function
pub fn configure_bpf_maps(bpf_skel: &mut NetSkel) {
  let mut mapping: HashMap<(String, usize), i32> = HashMap::new();

  // lookup hit placeholder
  let t_hit: i32 = 1;
  let t_hit_ptr: *const c_void = ref_to_voidp(&t_hit);
  // get policy map from skeleton
  let net_policy_map_fd = bpf_skel.maps_mut().net_policy_map().fd();

  // create and load bpf maps
  unsafe {
    let mut curr_policy_id: i32 = 0;
    for (policy_type, net_policies) in NET_POLICY.iter().enumerate() {
      for (policy_name, opt_host_policy) in net_policies {
        // "net": true
        if opt_host_policy.is_none() {
          continue;
        }

        // update policy mapping
        mapping.insert((policy_name.to_owned(), policy_type), curr_policy_id);

        let hosts = opt_host_policy.as_ref().unwrap();
        // for each host in the policy
        let mut nof_pairs = 0;
        for (_ip, ports) in hosts {
          nof_pairs += ports.len() as i32;
        }

        // create the bpf policy inner map
        let net_host_map_fd: i32 = bpf_create_map(
          BPF_MAP_TYPE_HASH,
          8 as i32, // size of packed connection_e (C) struct
          4 as i32, // size_of i32
          std::cmp::max(1, nof_pairs),
          0 as u32,
        );
        // get a ptr to the host map
        let net_ptr_host_map: *const c_void = ref_to_voidp(&net_host_map_fd);

        // populate the inner map
        for (ip, ports) in hosts {
          for port in ports {
            // set the ipv4 inner map entry
            let t_pentry = connection_e {
              port: *port, // port will be 0 if ip is allowed
              filler: 0,
              addr_32: *ip,
            };
            // get a pointer to the entry
            let t_pentry_ptr: *const c_void = ref_to_voidp(&t_pentry);
            // store the entry in the inner map
            let err = bpf_map_update_elem(
              net_host_map_fd,
              t_pentry_ptr,
              t_hit_ptr,
              BPF_ANY as u64,
            );
            if err != 0 {
              panic!("Failed insertion in host_map");
            }
          }
        }

        // store the inner map in the outer policy map
        let t_policy_ptr: *const c_void = ref_to_voidp(&curr_policy_id);
        let err = bpf_map_update_elem(
          net_policy_map_fd,
          t_policy_ptr,
          net_ptr_host_map,
          BPF_ANY as u64,
        );
        if err != 0 {
          panic!("Failed insertion in policy_map");
        }
        // close current host_map file descriptor
        nix::unistd::close(net_host_map_fd).unwrap();

        // auto increment map key
        curr_policy_id += 1;
      }
    }
    // close current poilcy_map file descriptor
    nix::unistd::close(net_policy_map_fd).unwrap();

    // initialize the global policy mapping
    POLICY_MAPPING.push(mapping);
  }

  // configure the map that forbids specific network socket families
  let net_forbidden_af_map_fd = bpf_skel.maps_mut().net_forbidden_af_map().fd();
  let blocked_af_families: [i32; 33] = [
    3,  /* Amateur Radio AX.25 */
    4,  /* Novell IPX */
    5,  /* AppleTalk DDP */
    6,  /* Amateur Radio NET/ROM */
    7,  /* Multiprotocol bridge */
    8,  /* ATM PVCs */
    9,  /* Reserved for X.25 project 	*/
    11, /* Amateur Radio X.25 PLP */
    12, /* Reserved for DECnet project */
    13, /* Reserved for 802.2LLC project*/
    14, /* Security callback pseudo AF */
    15, /* PF_KEY key management API */
    17, /* Packet family */
    20, /* ATM SVCs */
    22, /* Linux SNA Project (nutters!) */
    23, /* IRDA sockets */
    24, /* PPPoX sockets */
    25, /* Wanpipe API Sockets */
    26, /* Linux LLC */
    27, /* Native InfiniBand address	*/
    28, /* MPLS */
    29, /* Controller Area Network */
    30, /* TIPC sockets */
    31, /* Bluetooth sockets */
    32, /* IUCV sockets */
    33, /* RxRPC sockets */
    34, /* mISDN sockets */
    35, /* Phonet sockets */
    36, /* IEEE802154 sockets */
    37, /* CAIF sockets */
    39, /* NFC sockets */
    42, /* Qualcomm IPC Router          */
    44, /* XDP sockets */
  ];

  for family in blocked_af_families {
    // get a reference to the current policy
    let t_family_ptr: *const c_void = ref_to_voidp(&family);
    // insert current family in the bpf map
    unsafe {
      let err = bpf_map_update_elem(
        net_forbidden_af_map_fd,
        t_family_ptr,
        t_hit_ptr,
        BPF_ANY as u64,
      );
      if err != 0 {
        panic!("Failed insertion in forbidden_af_map");
      }
    }
  }
  // end unsafe block
}

pub fn get_nof_policies() -> usize {
  let mut nof_policies = 0;
  unsafe {
    for net_policy in &NET_POLICY {
      nof_policies += net_policy.len();
    }
  }
  nof_policies
}

// populate network bpf maps
pub fn load_bpf_programs_and_maps() -> Result<NetSkel<'static>> {
  // open skeleton
  let skel_builder = NetSkelBuilder::default();
  let mut open_skel = skel_builder.open()?;

  // write arguments into bpf memory
  let net_max_policy_entries: u32 = get_nof_policies() as u32;

  open_skel
    .maps_mut()
    .net_policy_map()
    .set_max_entries(net_max_policy_entries)?;

  // load skeleton into kernel
  let mut skel = open_skel.load()?;

  // attach progs
  skel.attach()?;

  // use policy configurator to configure bpf maps
  configure_bpf_maps(&mut skel);

  Ok(skel)
}

pub fn get_policy(name: &String, library_name: Option<&String>) -> Result<i32> {
  let full_name = get_ns_name(name, library_name);

  // Do not try to sandbox when no policy is given
  if unsafe { NET_POLICY.is_empty() } {
    warn!("NET: {} is running without a sandbox", full_name);
    return Err(anyhow!("No network policy found"));
  }

  let mut to_sandbox = false;
  let mut policy: i32 = 0;

  unsafe {
    let policy_mapping = &POLICY_MAPPING[0];

    let policy_type = match library_name {
      Some(_) => PolicyType::FFI,
      None => PolicyType::SUBPROCESS,
    };

    let key = &(full_name.to_owned(), policy_type as usize);
    let policy_id = policy_mapping.get(key);

    if let Some(policy_id) = policy_id {
      to_sandbox = true;
      policy = *policy_id;
    } else {
      if let Some(library_name) = library_name {
        // Fallback to library permissions
        let key = &(library_name.to_owned(), PolicyType::LIBRARY as usize);
        let policy_id = policy_mapping.get(key);

        if let Some(policy_id) = policy_id {
          to_sandbox = true;
          policy = *policy_id;
        }
      }
    }
  }

  // Do not sandbox when no policy is given for current command or function
  if !to_sandbox {
    warn!("NET: {} is running without a sandbox", full_name);
    return Err(anyhow!("No network policy found"));
  }
  Ok(policy)
}
