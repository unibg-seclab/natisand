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

var DEBUG_POLICY bool

// POLICY TYPE STRINGS

const (
	FFI        string = "ffi"
	LIBRARY           = "library"
	SUBPROCESS        = "subprocess"
)

// TYPE OPTIONS

const (
	UNDEFINED = iota
	DENIED
	ALLOWED
)

// POLICY

type Policies struct {
	PolicyList []Policy `json:"policies"`
}

type Policy struct {
	Name       string      `json:"name"`
	Type       TypeWrapper `json:"type"`
	FsWrapper  FsWrapper   `json:"fs"`
	IpcWrapper IpcWrapper  `json:"ipc"`
	NetWrapper NetWrapper  `json:"net"`
}

type TypeWrapper struct {
	Type string
}

// FILESYSTEM

type FsWrapper struct {
	RWX  RWXWrapper `json:"-"`
	Type int        `json:"-"`
}

type RWXWrapper struct {
	Read  ReadWrapper  `json:"read"`
	Write WriteWrapper `json:"write"`
	Exec  ExecWrapper  `json:"exec"`
}

type ReadWrapper struct {
	Entries []string `json:"-"`
	Type    int      `json:"-"`
}

type WriteWrapper struct {
	Entries []string `json:"-"`
	Type    int      `json:"-"`
}

type ExecWrapper struct {
	Entries []string `json:"-"`
	Type    int      `json:"-"`
}

// IPC

type IpcWrapper struct {
	Ipc  Ipc
	Type int `json:"-"`
}

type Ipc struct {
	Fifo      bool `json:"fifo"`
	Message   bool `json:"message"`
	Semaphore bool `json:"semaphore"`
	Shmem     bool `json:"shmem"`
	Signal    bool `json:"signal"`
	Socket    bool `json:"socket"`
}

// NETWORK

type NetWrapper struct {
	Hosts  []NetHost  `json:"-"`
	HostsT []NetHostT `json:"-"`
	Type   int        `json:"-"`
}

type NetHost struct {
	Hostname string      `json:"name"`
	Pwrapper PortWrapper `json:"ports"`
}

type NetHostT struct {
	IP       uint32      `json:"ip"`
	Pwrapper PortWrapper `json:"ports"`
}

type PortWrapper struct {
	Ports []uint16 `json:"-"`
	Type  int      `json:"-"` // 0 -> array based, 1 -> false, 2 -> true
}
