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
	"bufio"
	"encoding/json"
	"os"
)

// Marshals the translated policy to the `pathName` file
func writePolicyToJson(policy Policies, pathName string) {

	// marshal the policy
	data, err := json.Marshal(policy)
	if err != nil {
		panic("[E] Cannot marshal translated policy " + err.Error())
	}

	f, err := os.OpenFile(pathName, os.O_RDWR|os.O_CREATE|os.O_TRUNC, 0644)
	if err != nil {
		panic("[E] Cannot open translated policy file " + err.Error())
	}
	defer f.Close()

	writer := bufio.NewWriter(f)
	_, err = f.Write(data)
	if err != nil {
		panic("[E] Cannot write translated policy to file " + err.Error())
	}

	writer.Flush()
}
