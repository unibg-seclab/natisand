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
	"log"
)

type Translator struct {
	Policy      Policies
	PolicyPath  string
	PolicyTPath string
	Resolver    NameResolver
}

func (t *Translator) readPolicy(policyPath string) {

	t.PolicyPath = policyPath
	t.Policy = readPolicyFromJson(t.PolicyPath)
}

func (t *Translator) writePolicy(policyTPath string) error {

	// if t.PolicyT == nil {
	// 	return errors.New("No previous policy translation")
	// }
	if DEBUG_POLICY {
		log.Println("MARSHAL POLICY")
	}
	t.PolicyTPath = policyTPath
	writePolicyToJson(t.Policy, policyTPath)

	return nil
}

func (t *Translator) translate(r NameResolver) error {

	if DEBUG_POLICY {
		log.Println("POLICY TRANSLATION")
	}
	nofPolicies := len(t.Policy.PolicyList)
	for i := 0; i < nofPolicies; i++ {
		currPolicy := t.Policy.PolicyList[i]
		t.Policy.PolicyList[i].NetWrapper.HostsT = *r.translateNames(&currPolicy.NetWrapper)
	}

	return nil
}

// Function called to translate a json policy
func (t *Translator) TranslatePolicy(policyPath, policyTPath string, r NameResolver) error {

	// read policy
	t.readPolicy(policyPath)
	// translate policy
	t.Resolver = r
	t.translate(r)
	// write policy
	t.writePolicy(policyTPath)

	return nil

}
