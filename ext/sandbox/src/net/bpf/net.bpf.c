// SPDX-License-Identifier: MIT OR GPL-2.0
#include "vmlinux.h"
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_tracing.h>
#include <bpf/bpf_core_read.h>
#include "network.h"
#include "structs.h"
#include <stdbool.h>

#include <bpf/bpf_endian.h>

#ifndef AF_INET
#define AF_INET 2
#endif

#ifndef AF_INET6
#define AF_INET6 10
#endif

#ifndef INET6_ADDRSTRLEN
#define INET6_ADDRSTRLEN 48
#endif

char LICENSE[] SEC("license") = "Dual MIT/GPL";

/* bpf maps */
struct {
	__uint(type, BPF_MAP_TYPE_TASK_STORAGE);
	__uint(map_flags, BPF_F_NO_PREALLOC);
	__type(key, int);   // task struct
	__type(value, int); // policy identifier
} net_tracee_map SEC(".maps");

struct {
	__uint(type, BPF_MAP_TYPE_HASH);
	__uint(max_entries, 33); // current af limit	
	__type(key, int); // socket family
	__type(value, int);
} net_forbidden_af_map SEC(".maps");

struct {
	__uint(type, BPF_MAP_TYPE_ARRAY_OF_MAPS);
	__uint(max_entries, 1); // placeholder, set from userspace
	__uint(key_size, sizeof(int)); // policy identifier
	__uint(value_size, sizeof(int));	
	/* anonymous inner host map*/
	__array(values, struct {
		__uint(type, BPF_MAP_TYPE_HASH);
		__uint(max_entries, 1); // placeholder, size set from userspace
		__uint(key_size, sizeof(struct connection_e));
		__uint(value_size, sizeof(int));
	});
} net_policy_map SEC(".maps");

/*
 * Utility to check if policy is attached to the current thread
 */
static inline int is_traced()
{
	struct task_struct *ts = bpf_get_current_task_btf();
	int *policy = NULL;
	policy = bpf_task_storage_get(&net_tracee_map, ts, 0, 0);

	/* cache hit => net_tracee_pid's descendant */
	return policy != NULL;
}

static inline void conn_e_print(struct connection_e* c, char * prefix) {
	/* ipv4 address */
	bpf_printk("%s port Big-Endian int: %d", prefix, c->port);
	bpf_printk("%s ip Big-Endian u32: %lu", prefix, (unsigned long)(c->addr_32));
	bpf_printk("%s filler: %d", prefix, c->filler);
}

static void conn_e_printer(struct bpf_map* map, struct connection_e* c, int* v, void* ctx){
#ifdef DEBUG
	bpf_printk("printer:");
	conn_e_print(c, "   p:");
#endif
}

/*
 * Net filter
 * 1) is a policy attached to the current thread?
 * 2) get the policy-related map
 * 3) check connection host+port
 * returns:
 *     1, block connection
 *     0, allow connection
 */
static inline int connection_filter(struct connection_e conn_e)
{
	struct task_struct *ts;
	ts = (struct task_struct *)bpf_get_current_task_btf();

	int *policy = NULL;
	policy = bpf_task_storage_get(&net_tracee_map, ts, 0, 0);

	if (policy == NULL) {
#ifdef DEBUG
		bpf_printk("  -> no policy attached");
#endif
		return 0;
	}
	// get the policy map
	struct bpf_map *host_map = bpf_map_lookup_elem(&net_policy_map, policy);
	if (host_map){
#ifdef DEBUG
		bpf_printk("  -> net policy %d found", *policy);
		//bpf_for_each_map_elem(host_map, conn_e_printer, NULL, 0);		
#endif
		/* check port = any */
		u16 true_port = conn_e.port;
		conn_e.port = 0;
		int *hit = bpf_map_lookup_elem(host_map, &conn_e);
		if (hit) {
#ifdef DEBUG
                  bpf_printk("  -> all ports allowed");
#endif
			return 0;
		}
		/* check current port */
		conn_e.port = true_port;
#ifdef DEBUG
		conn_e_print(&conn_e, "  ->");
#endif
		hit = bpf_map_lookup_elem(host_map, &conn_e);
		if (hit) {
#ifdef DEBUG
                  bpf_printk("  -> allowed");
#endif
			return 0;
		} else {
#ifdef DEBUG
			bpf_printk("  -> blocked");
#endif
			return 1;
		}
	}
#ifdef DEBUG
	bpf_printk("  -> blocked (no permission found)");
#endif
	return 1;
}

SEC("lsm/socket_create")
int BPF_PROG(socket_create, int family, int type, int protocol, int kern)
{
	if (is_traced()){
		/* if the program has a policy attached, forbid any
		 * socket_create where family in
		 * net_forbidden_af_map */
#ifdef DEBUG
		pid_t pid = bpf_get_current_pid_tgid() >> 32;
		bpf_printk("SK: socket_create, pid: %d, family: %d", pid, family);
#endif		
		int *hit = NULL;
		hit = bpf_map_lookup_elem(&net_forbidden_af_map, &family);
		if (hit != NULL) {
#ifdef DEBUG
			bpf_printk("  -> socket_create blocked");
#endif			
			return 1;
		}
#ifdef DEBUG
		else {
			bpf_printk("  -> socket_create allowed");
		}
#endif			
	}
	return 0;
}

static inline int check_connection(struct sockaddr *address)
{
	__be32 *ip;
	__be16 *port;
	ip = &(((struct sockaddr_in*)address)->sin_addr.s_addr);
	port = &(((struct sockaddr_in*)address)->sin_port);

	struct connection_e conn_e = {
		.filler = 0,
	};
	/* always use host encoding */
	conn_e.addr_32 = bpf_ntohl(*ip);
	conn_e.port = bpf_ntohs(*port);
	
#ifdef DEBUG			
	bpf_printk("  -> ip4 %pI4", ip);
	bpf_printk("  -> ip4 port %d", bpf_ntohs(*port));
#endif			
	/* host filtering */
	if (connection_filter(conn_e)){
		return 1; 
	}
	
	return 0;	       
}

SEC("lsm/socket_bind")
int BPF_PROG(socket_bind, struct socket *sock, struct sockaddr *address, int addrlen)
{
	if (is_traced()) {
#ifdef DEBUG
		pid_t pid = bpf_get_current_pid_tgid() >> 32;
		bpf_printk("SK: socket_bind, pid: %d, family %d", pid, address->sa_family);
#endif
		/* assigning a name to a socket is allowed only when
		 * the policy grants the server to use localhost */
		if (address->sa_family == AF_INET){
			if (check_connection(address)){
				return 1;
			}
		} else if(address->sa_family == AF_INET6){
#ifdef DEBUG
			bpf_printk("  socket_bind with ip6 temporarily disabled");
			return 1;
#endif			
		}
	}
	return 0;
}

SEC("lsm/socket_connect")
int BPF_PROG(socket_connect, struct socket *sock, struct sockaddr *address, int addrlen)
{
	if (is_traced()){
#ifdef DEBUG
		pid_t pid = bpf_get_current_pid_tgid() >> 32;
		bpf_printk("%s %d", "SK: socket_connect, pid:", pid);
#endif
		if (address->sa_family == AF_INET){
			if (check_connection(address)){
				return 1;
			}
		} else if(address->sa_family == AF_INET6){
			struct in6_addr * ip;
			ip = &(((struct sockaddr_in6*)address)->sin6_addr);			
#ifdef DEBUG
			bpf_printk("  -> ip6 %pI6", ip);
			bpf_printk("  -> ip6 temporarily disabled");			
#endif
			return 1;
		} 
#ifdef DEBUG
                  else {
			char sa_data[14];
			bpf_core_read_str(&sa_data, sizeof(sa_data), &address->sa_data);
			if (strcmp(sa_data, "")){
				bpf_printk("[W] Detected socket_connect not in {AFINET; AFINET6}, family %d", address->sa_family);
				bpf_printk("  -> sa data %s", sa_data);
			}
		}
#endif
	}
	return 0;
}

/*
 * NOTE:
 *   listen: not restricted as it acts only passively
 *   accept: see socket_create
 */

/*
 * Uprobe-based policy attachment
 */
SEC("uprobe//proc/self/exe:attach_net_policy")
void BPF_KPROBE(attach_policy, int pol_id)
{
	int policy = pol_id;
#ifdef DEBUG
	pid_t curr_pid = bpf_get_current_pid_tgid() >> 32;
	bpf_printk("attaching policy %d to c_id %d", pol_id, curr_pid);
#endif
	struct task_struct *ts;
	ts = (struct task_struct *)bpf_get_current_task_btf();
	bpf_task_storage_get(&net_tracee_map, ts, &policy, BPF_LOCAL_STORAGE_GET_F_CREATE);
}

/*
 * Fork-based policy attachment
 */
SEC("tp_btf/sched_process_fork")
int BPF_PROG(check_fork, struct task_struct *parent, struct task_struct *child)
{
	int *policy = NULL;
	policy = bpf_task_storage_get(&net_tracee_map, parent, 0, 0);

	/* if parent has a policy attached */
	if (policy != NULL) {
#ifdef DEBUG
		pid_t curr_pid = bpf_get_current_pid_tgid() >> 32;
		bpf_printk("ATTACH, c_id %d, policy %d", curr_pid, *policy);
#endif
		bpf_task_storage_get(&net_tracee_map, child, policy, BPF_LOCAL_STORAGE_GET_F_CREATE);
	}

	return 0;
}

/*
 * Policy detach
 */
SEC("tp/sched/sched_process_exit")
int BPF_PROG(check_exit, struct task_struct *child)
{
	pid_t c_pid = bpf_get_current_pid_tgid() >> 32;
	struct task_struct *ts = bpf_get_current_task_btf();
	
	/* remove the child task from the tracee map*/
	int res = bpf_task_storage_delete(&net_tracee_map, ts);
#ifdef DEBUG
	if (res == 0){
		bpf_printk("DETACH: c_pid %d", c_pid);
	}
#endif

	return 0;
}    
