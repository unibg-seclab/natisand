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

package net_policy

import (
	"encoding/binary"
	"fmt"
	"log"
	"net"
	"strconv"

	"github.com/miekg/dns"
)

type DnsServer struct {
	Name string
	Port int
}

type NameResolver struct {
	Resolvers []DnsServer
	Types     []string // todo: use this field
}

// Translates a `policy`. In a translated policy, hostnames are
// replaced with IP addresses. Multiple IPs can be generated for each
// hostname
func (r *NameResolver) translateNames(policy *NetWrapper) *[]NetHostT {

	var newHosts []NetHostT
	// hosts = "any"
	if policy.Type == ALLOWED {
		return &newHosts
	}
	if policy.Hosts == nil || len(policy.Hosts) == 0 {
		policy.Type = DENIED
		return &newHosts
	}
	// for each host
	for _, host := range policy.Hosts {
		// invalid host-entry detected
		if host.Pwrapper.Type == DENIED || // case 1: host denied
			(host.Pwrapper.Ports != nil && len(host.Pwrapper.Ports) == 0) { // case 2: empty array of ports given
			continue
		}
		// resolve hostname
		var translations []NetHostT
		if hostIp, ok := isAlreadyIp(host.Hostname); ok {
			hostIpEncoded := ip2intbe(hostIp)
			translations = append(translations,
				NetHostT{IP: hostIpEncoded,
					Pwrapper: host.Pwrapper})
			log.Printf("%v, %v", translations, host.Pwrapper)
		} else {
			translations = r.translate(host.Hostname, host.Pwrapper)
		}
		newHosts = append(newHosts, translations...)
	}
	if len(newHosts) != 0 {
		// embed local dns
		ldnsIp := ip2intbe(net.ParseIP(r.Resolvers[0].Name))
		ldnsPorts := []uint16{uint16(r.Resolvers[0].Port)}
		newHosts = append(newHosts, NetHostT{IP: ldnsIp,
			Pwrapper: PortWrapper{Type: UNDEFINED, Ports: ldnsPorts}})
		//fmt.Printf("%v\n", newHosts)
		//policy.HostsT = newHosts
	} else { // corner case: messed up with every host in the list
		policy.Type = DENIED
	}
	// store the translated hosts
	return &newHosts

}

// function to check whether an ip was already provided by the
// developer
func isAlreadyIp(hostname string) (net.IP, bool) {
	ip := net.ParseIP(hostname)
	if ip != nil {
		return ip, true
	}
	return nil, false
}

// This function queries all the DNS servers available to translate a
// hostname. Ports are not used currently. Todo: implement support for
// ipv6 addresses
func (r *NameResolver) translate(hostname string, pwrapper PortWrapper) []NetHostT {

	// policy entries in the result
	var res []NetHostT
	// map of (unique) hostname translation
	sol := make(map[uint32]bool)

	// for each dns resolver
	for _, server := range r.Resolvers {
		// select the query types (todo: handle ipv6 addresses)
		hostTypes := []string{"A"}
		// for each type
		for _, hostType := range hostTypes {
			// for each ip translation
			for _, ip := range resolve(hostname, hostType, server) {
				sol[ip] = true
			}

		}
	}
	// extract unique translations
	for ip := range sol {
		res = append(res, NetHostT{IP: ip, Pwrapper: pwrapper})
	}
	return res
}

// This function sends a question to a DNS `server`. When a question
// has no answer, the NameResolver fails
func resolve(hostname string, hostType string, server DnsServer) []uint32 {

	var res []uint32

	c := dns.Client{}
	m := dns.Msg{}

	if hostType != "A" {
		log.Fatalf("Unimplemented hostname resolution, type: %v", hostType)
	}
	// todo: make better use of question params
	m.SetQuestion(hostname+".", dns.TypeA)
	m.RecursionDesired = true
	r, t, err := c.Exchange(&m, server.Name+":"+strconv.Itoa(server.Port))
	if err != nil {
		log.Fatal(err)
	}
	if DEBUG_POLICY {
		log.Printf("server: %v, rtt: %v, host: %s", server.Name, t, hostname)
	}
	if len(r.Answer) == 0 {
		log.Fatal("DNS Error: unable to answer question")
	}

	for _, ans := range r.Answer {
		switch ans.(type) {
		case *dns.A:
			Arecord := ans.(*dns.A)
			IP := ip2intbe(Arecord.A)
			res = append(res, IP)
			if DEBUG_POLICY {
				fmt.Printf("\tdns.TypeA\t IP: %v\tBigE.: %v\n", Arecord.A, IP)
			}
		case *dns.CNAME:
			record := ans.(*dns.CNAME)
			if DEBUG_POLICY {
				fmt.Printf("\tdns.TypeCNAME\trecord: %v\n", record)
			}
		default:
			log.Fatalf("\tUnimplemented type received, DNS answer: %v\n", ans)
		}
	}

	return res
}

// Utility to convert an IP to Big-Endian uint32
func ip2intbe(ip net.IP) uint32 {
	if len(ip) == 16 {
		return binary.BigEndian.Uint32(ip[12:16])
	}
	return binary.BigEndian.Uint32(ip)
}
