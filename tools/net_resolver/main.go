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

package main

import (
	"encoding/binary"
	"fmt"
	"net"
	"os"
	"strconv"
	"strings"

	"example.com/net_policy"
	"github.com/akamensky/argparse"
)

var DEBUG bool

func main() {

	parser := argparse.NewParser(
		"net-translator",
		"Process the policy file and translate hostnames into IPs",
	)

	var DEBUG_MODE *bool = parser.Flag("d", "debug",
		&argparse.Options{
			Help: "Enable verbose output"})
	var LDNS *string = parser.String("l", "local-dns",
		&argparse.Options{
			Required: true,
			Help:     "Missing local DNS, e.g.: 127.0.0.53:53"})
	var ODNS *string = parser.String("r", "remote-dns",
		&argparse.Options{
			Required: false,
			Help:     "Other DNS resolvers, e.g.: 8.8.8.8:53 8.8.4.4:53"})
	var IN *string = parser.String("i", "in",
		&argparse.Options{
			Required: true,
			Help:     "Input policy file"})
	var OUT *string = parser.String("o", "out",
		&argparse.Options{
			Required: true,
			Help:     "Output policy files"})

	err := parser.Parse(os.Args)
	if err != nil {
		fmt.Print(parser.Usage(err))
		os.Exit(0)
	}

	net_policy.DEBUG_POLICY = *DEBUG_MODE

	policyPath := *IN
	policyTPath := *OUT

	// translator
	translator := net_policy.Translator{}
	// dns servers
	var dnsServers []net_policy.DnsServer
	// resolver
	resolver := net_policy.NameResolver{}

	// configure resolvers
	initializeResolver(*LDNS, strings.Split(*ODNS, " "), &dnsServers, &resolver)

	// translate policy
	translatePolicy(policyPath, policyTPath, translator, resolver)

}

func initializeResolver(ldns string, odns []string, dnsServers *[]net_policy.DnsServer,
	resolver *net_policy.NameResolver) {

	// configure local dns
	var addr string = strings.Split(ldns, ":")[0]
	port, err := strconv.Atoi(strings.Split(ldns, ":")[1])
	if err != nil {
		panic("Invalid port for local DNS")
	}
	*dnsServers = append(*dnsServers, net_policy.DnsServer{Name: addr, Port: port})

	// configure other dns dnsServers
	if odns != nil {
		for _, dns := range odns {
			var addr string = strings.Split(dns, ":")[0]
			port, err := strconv.Atoi(strings.Split(dns, ":")[1])
			if err != nil {
				panic("Invalid port for DNS " + addr)
			}
			*dnsServers = append(*dnsServers,
				net_policy.DnsServer{Name: addr, Port: port})
		}
	}

	// configure resolvers
	resolver.Resolvers = *dnsServers

}

func translatePolicy(policyPath, policyTPath string, translator net_policy.Translator,
	resolver net_policy.NameResolver) {

	translator.TranslatePolicy(policyPath, policyTPath, resolver)
}

func int2ip(nn uint32) net.IP {
	ip := make(net.IP, 4)
	binary.BigEndian.PutUint32(ip, nn)
	return ip
}
