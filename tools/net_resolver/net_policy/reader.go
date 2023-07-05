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
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"
)

// Unmarshals the policy written by the developer to `pathName` and
// returns its content
func readPolicyFromJson(pathName string) Policies {

	if DEBUG_POLICY {
		log.Println("UNMARSHAL POLICY")
	}
	policyFile, err := os.Open(pathName)
	if err != nil {
		panic("[E] Cannot open policy file: " + err.Error())
	}
	defer policyFile.Close()

	policyContent, err := ioutil.ReadAll(policyFile)
	if err != nil {
		panic("[E] Cannot read policy content: " + err.Error())
	}

	var policies Policies
	err = json.Unmarshal(policyContent, &policies)

	if err != nil {
		panic("[E] Cannot deserialize policy content: " + err.Error())
	}

	// check each policy has a proper name
	for _, p := range policies.PolicyList {
		if p.Name == "" {
			panic("Found policy with undefined `name` field")
		}
	}

	if DEBUG_POLICY {
		for _, policy := range policies.PolicyList {
			fmt.Printf("Policy name: %s\n", policy.Name)
			if policy.Type.Type == "" {
				policy.Type.Type = SUBPROCESS
			}
			fmt.Printf("Policy type: %s\n", policy.Type.Type)
			netPolicy := policy.NetWrapper
			if netPolicy.Type == ALLOWED {
				fmt.Printf("\tALLOW ALL\n")
			} else if netPolicy.Hosts == nil || len(netPolicy.Hosts) == 0 {
				fmt.Printf("\tDENY ALL\n")
			} else {
				for _, h := range netPolicy.Hosts {
					fmt.Printf("\tname: %v\t", h.Hostname)
					switch h.Pwrapper.Type {
					case UNDEFINED:
						if h.Pwrapper.Ports != nil {
							fmt.Printf("%v\n", h.Pwrapper.Ports)
						} else {
							fmt.Printf("ALLOWED\n")
						}
					case DENIED:
						fmt.Printf("DENIED\n")
					case ALLOWED:
						fmt.Printf("ALLOWED\n")
					}
				}
			}
		}
	}

	return policies

}
