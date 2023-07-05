#include "vmlinux.h"
#define __PACKED __attribute__((__packed__))

struct connection_e {
	u16 port;    // 0 to enable all the ports for the current host
		     // (NB 0 is an invalid port number)
	u16 filler;
	u32 addr_32; 
};
