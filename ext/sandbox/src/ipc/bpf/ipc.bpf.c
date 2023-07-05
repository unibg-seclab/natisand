#include "vmlinux.h"
#include <bpf/bpf_core_read.h>
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_tracing.h>

// include/uapi/asm-generic/errno-base.h
#define EPERM       1

// include/uapi/asm-generic/signal.h
#define SIGKILL     9

// include/linux/socket.h
#define AF_UNIX     1
#define PF_UNIX     AF_UNIX

#define FIFO        0b00000001
#define MESSAGE     0b00000010
#define SEMAPHORE   0b00000100
#define SHMEM       0b00001000
#define SIGNAL      0b00010000
#define SOCKET      0b00100000

char LICENSE[] SEC("license") = "Dual MIT/GPL";

struct {
    __uint(type, BPF_MAP_TYPE_TASK_STORAGE);
    __uint(map_flags, (BPF_F_NO_PREALLOC));
    __type(key, int);
    __type(value, u8);
} task_map SEC(".maps");

/* POLICY ATTACHMENT */

/*
 * Attach policy to the current task. It is used on subprocess initialization
 * to ensure it runs within the policy defined boundaries
 */
SEC("uprobe//proc/self/exe:attach_ipc_policy")
void BPF_KPROBE(attach_policy, u8 policy) {
    struct task_struct *task = (struct task_struct *)bpf_get_current_task_btf();
    bpf_task_storage_get(&task_map, task, &policy,
                         BPF_LOCAL_STORAGE_GET_F_CREATE);
#ifdef DEBUG
    bpf_printk("attach_policy: attaching policy %d TO %d", policy, task->pid);
    if (!(policy & FIFO))
        bpf_printk("attach_policy: filtering FIFO");
    if (!(policy & MESSAGE))
        bpf_printk("attach_policy: filtering MESSAGE");
    if (!(policy & SEMAPHORE))
        bpf_printk("attach_policy: filtering SEMAPHORE");
    if (!(policy & SHMEM))
        bpf_printk("attach_policy: filtering SHMEM");
    if (!(policy & SIGNAL))
        bpf_printk("attach_policy: filtering SIGNAL");
    if (!(policy & SOCKET))
        bpf_printk("attach_policy: filtering SOCKET");
#endif /* DEBUG */
}

/*
 * Inherit the parent task policy in the child task
 */
static __always_inline void inherit_policy(struct task_struct *parent,
                                           struct task_struct *child,
                                           bool is_lsm) {
    u8 *parent_task_policy = (u8 *) bpf_task_storage_get(&task_map,
                                                         parent, 0, 0);
    if (parent_task_policy) {
        bpf_task_storage_get(&task_map, child, parent_task_policy,
                             BPF_LOCAL_STORAGE_GET_F_CREATE);
#ifdef DEBUG
        bpf_printk("%s: inheriting policy FROM %d TO %d", (is_lsm ? "task_alloc" : "sched_process_fork"), parent->pid, child->pid);
#endif /* DEBUG */
    }
}

/*
 * Force policy inheritance when a process forks itself
 */
SEC("tp_btf/sched_process_fork")
void BPF_PROG(inherit_policy_on_fork, struct task_struct *parent,
              struct task_struct *child) {
    inherit_policy(parent, child, false);
}

/*
 * Drop policy of the current task. It is used on process exit to free
 * any policy configuration associated with the pid of the process.
 */
SEC("tp_btf/sched_process_exit")
void BPF_PROG(delete_policy_on_exit, struct task_struct *task) {
    bool err = bpf_task_storage_delete(&task_map, task);
#ifdef DEBUG
    if (!err)
        bpf_printk("sched_process_exit: exiting FROM %d", task->pid);
#endif /* DEBUG */
}

/* POLICY ENFORCEMENT */

bool is_enabled(u8 filter_type) {
    struct task_struct *task = (struct task_struct *) bpf_get_current_task_btf();
    u8 *policy = (u8 *) bpf_task_storage_get(&task_map, task, 0, 0);
    return (policy != NULL) && !(*policy & filter_type);
}

/*
 * Kill process violating fifo policy
 *
 * Throwing a permission error with lsm/file_open hook is not an option due to
 * the lack of the information necessary to understand wether the file is a
 * pipe.
 *
 * The only option identified would require to:
 * 1. retrieve the address of the pipefifo_fops structure
 * 2. deny any file_open with file operations pointing to the address of the
 *    pipefifo_fops structure
*/
SEC("fentry/fifo_open")
int BPF_PROG(fifo_filter_fifo_open, struct inode *inode, struct file *filp) {
    if (!is_enabled(FIFO))
        return 0;
#ifdef DEBUG
    bpf_printk("fifo_open: killing process");
#endif /* DEBUG */
    bpf_send_signal(SIGKILL);
    return 0;
}

bool is_unix_socket(struct socket *sock, struct sockaddr *address) {
    bool is_unix_protocol = sock->sk->__sk_common.skc_family == PF_UNIX;
    bool is_unix_address = address->sa_family == AF_UNIX;
    return is_unix_protocol || is_unix_address;
}

SEC("lsm/socket_bind")
int BPF_PROG(socket_filter_unix_socket_bind, struct socket *sock,
             struct sockaddr *address, int addrlen) {
    if (!is_enabled(SOCKET) || !is_unix_socket(sock, address))
        return 0;
#ifdef DEBUG
    bpf_printk("socket_bind: denying bind request");
#endif /* DEBUG */
    return -EPERM;
}

SEC("lsm/socket_connect")
int BPF_PROG(socket_filter_unix_socket_connect, struct socket *sock,
             struct sockaddr *address, int addrlen) {
    if (!is_enabled(SOCKET) || !is_unix_socket(sock, address))
        return 0;
#ifdef DEBUG
    bpf_printk("socket_connect: denying connect request");
#endif /* DEBUG */
    return -EPERM;
}
