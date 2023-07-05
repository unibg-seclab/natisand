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
	"regexp"
	"strings"
)

// POLICY

func (p *Policy) MarshalJSON() ([]byte, error) {

	sb := strings.Builder{}
	sb.WriteString("{")

	// header
	name, err := json.Marshal(&p.Name)
	if err != nil {
		panic(err)
	}
	ttype, err := json.Marshal(&p.Type)
	if err != nil {
		panic(err)
	}
	// embedding
	sb.Write([]byte("\"name\":"))
	sb.Write(name)
	sb.WriteByte(',')
	sb.Write([]byte("\"type\":"))
	sb.Write(ttype)
	sb.WriteByte(',')

	// sandbox
	fs, err := json.Marshal(&p.FsWrapper)
	if err != nil {
		panic(err)
	}
	ipc, err := json.Marshal(&p.IpcWrapper)
	if err != nil {
		panic(err)
	}
	net, err := json.Marshal(&p.NetWrapper)
	if err != nil {
		panic(err)
	}

	Reg := regexp.MustCompile("false")
	if !Reg.Match(fs) {
		sb.Write([]byte("\"fs\":"))
		sb.Write(fs)
		sb.WriteByte(',')
	}

	if !Reg.Match(ipc) {
		sb.Write([]byte("\"ipc\":"))
		sb.Write(ipc)
		sb.WriteByte(',')
	}

	if !Reg.Match(net) {
		sb.Write([]byte("\"net\":"))
		sb.Write(net)
		sb.WriteByte(',')
	}

	value := sb.String()
	// stripping comma (there is always one)
	value = value[:len(value)-1]
	res := []byte(value)
	res = append(res, byte('}'))

	return res, nil

}

func (t *TypeWrapper) MarshalJSON() ([]byte, error) {
	if t.Type == "" {
		t.Type = SUBPROCESS
	}
	return []byte("\"" + t.Type + "\""), nil
}

// FILESYSTEM

func (fs *FsWrapper) MarshalJSON() ([]byte, error) {
	switch fs.Type {
	case DENIED:
		return []byte("false"), nil
	case ALLOWED:
		return []byte("true"), nil
	default:
		if fs.RWX.Read.Type != ALLOWED &&
			fs.RWX.Write.Type != ALLOWED &&
			fs.RWX.Exec.Type != ALLOWED {
			if fs.RWX.Read.Entries == nil &&
				fs.RWX.Write.Entries == nil &&
				fs.RWX.Exec.Entries == nil {
				return []byte("false"), nil
			}
		}
		return json.Marshal(&fs.RWX)
	}
}

func (rwx *RWXWrapper) MarshalJSON() ([]byte, error) {

	sb := strings.Builder{}
	sb.WriteString("{")
	commaToDrop := false
	if rwx.Read.Type == ALLOWED ||
		rwx.Read.Entries != nil {
		commaToDrop = true
		res, err := json.Marshal(&rwx.Read)
		if err != nil {
			return nil, err
		}
		sb.Write([]byte("\"read\":"))
		sb.Write(res)
		sb.WriteByte(',')
	}
	if rwx.Write.Type == ALLOWED ||
		rwx.Write.Entries != nil {
		commaToDrop = true
		res, err := json.Marshal(&rwx.Write)
		if err != nil {
			return nil, err
		}
		sb.Write([]byte("\"write\":"))
		sb.Write(res)
		sb.WriteByte(',')
	}
	if rwx.Exec.Type == ALLOWED ||
		rwx.Exec.Entries != nil {
		commaToDrop = true
		res, err := json.Marshal(&rwx.Exec)
		if err != nil {
			return nil, err
		}
		sb.Write([]byte("\"exec\":"))
		sb.Write(res)
		sb.WriteByte(',')
	}

	value := sb.String()
	if commaToDrop {
		value = value[:len(value)-1]
	}
	res := []byte(value)
	res = append(res, byte('}'))

	return res, nil
}

func (r *ReadWrapper) MarshalJSON() ([]byte, error) {
	switch r.Type {
	case DENIED:
		return []byte("false"), nil
	case ALLOWED:
		return []byte("true"), nil
	default:
		if r.Entries == nil {
			return []byte("false"), nil
		}
		return json.Marshal(&r.Entries)
	}
}

func (w *WriteWrapper) MarshalJSON() ([]byte, error) {
	switch w.Type {
	case DENIED:
		return []byte("false"), nil
	case ALLOWED:
		return []byte("true"), nil
	default:
		if w.Entries == nil {
			return []byte("false"), nil
		}
		return json.Marshal(&w.Entries)
	}
}

func (e *ExecWrapper) MarshalJSON() ([]byte, error) {
	switch e.Type {
	case DENIED:
		return []byte("false"), nil
	case ALLOWED:
		return []byte("true"), nil
	default:
		if e.Entries == nil {
			return []byte("false"), nil
		}
		return json.Marshal(&e.Entries)
	}
}

// IPC

func (i *IpcWrapper) MarshalJSON() ([]byte, error) {
	switch i.Type {
	case DENIED:
		return []byte("false"), nil
	case ALLOWED:
		return []byte("true"), nil
	default:
		value := Ipc{}
		if i.Ipc == value {
			return []byte("false"), nil
		}
		return json.Marshal(&i.Ipc)
	}
}

func (i *Ipc) MarshalJSON() ([]byte, error) {

	var sb strings.Builder
	sb.WriteString("{")
	commaToDrop := false
	if i.Fifo {
		sb.WriteString("\"fifo\": true,")
		commaToDrop = true
	}
	if i.Message {
		sb.WriteString("\"message\": true,")
		commaToDrop = true
	}
	if i.Semaphore {
		sb.WriteString("\"semaphore\": true,")
		commaToDrop = true
	}
	if i.Shmem {
		sb.WriteString("\"shmem\": true,")
		commaToDrop = true
	}
	if i.Signal {
		sb.WriteString("\"signal\": true,")
		commaToDrop = true
	}
	if i.Socket {
		sb.WriteString("\"socket\": true,")
		commaToDrop = true
	}

	value := sb.String()
	if commaToDrop {
		value = value[:len(value)-1]
	}
	res := []byte(value)
	res = append(res, byte('}'))

	return res, nil
}

// NETWORK

func (n *NetWrapper) MarshalJSON() ([]byte, error) {
	switch n.Type {
	case DENIED:
		return []byte("false"), nil
	case ALLOWED:
		return []byte("true"), nil
	default:
		if n.HostsT == nil || len(n.HostsT) == 0 {
			return []byte("false"), nil
		}
		return json.Marshal(&n.HostsT)
	}
}

func (p *PortWrapper) MarshalJSON() ([]byte, error) {
	switch p.Type {
	case DENIED:
		return []byte("false"), nil
	case ALLOWED:
		return []byte("true"), nil
	default:
		if p.Ports == nil {
			return []byte("true"), nil
		}
		if len(p.Ports) == 0 {
			return []byte("false"), nil
		}
		return json.Marshal(&p.Ports)
	}
}
