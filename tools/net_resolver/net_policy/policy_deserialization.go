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
	"errors"
	"strconv"
)

func (p *PortWrapper) UnmarshalJSON(data []byte) error {
	p.Type = UNDEFINED
	if ttype, err := strconv.ParseBool(string(data)); err == nil {
		p.Type = DENIED
		if ttype {
			p.Type = ALLOWED
		}
		return nil
	}
	return json.Unmarshal(data, &p.Ports)
}

func (h *NetWrapper) UnmarshalJSON(data []byte) error {
	h.Type = UNDEFINED
	if ttype, err := strconv.ParseBool(string(data)); err == nil {
		h.Type = DENIED
		if ttype {
			h.Type = ALLOWED
		}
		return nil
	}
	return json.Unmarshal(data, &h.Hosts)
}

func (t *TypeWrapper) UnmarshalJSON(data []byte) error {

	ttype := string(data)
	ttype = ttype[1 : len(ttype)-1]

	switch ttype {
	case FFI:
		t.Type = ttype
	case LIBRARY:
		t.Type = ttype
	case SUBPROCESS:
		t.Type = ttype
	default:
		return errors.New("Unspecified policy type")
	}

	return nil
}

func (i *IpcWrapper) UnmarshalJSON(data []byte) error {
	i.Type = UNDEFINED
	if ttype, err := strconv.ParseBool(string(data)); err == nil {
		i.Type = DENIED
		if ttype {
			i.Type = ALLOWED
		}
		return nil
	}
	return json.Unmarshal(data, &i.Ipc)
}

func (fs *FsWrapper) UnmarshalJSON(data []byte) error {
	fs.Type = UNDEFINED
	if ttype, err := strconv.ParseBool(string(data)); err == nil {
		fs.Type = DENIED
		if ttype {
			fs.Type = ALLOWED
		}
		return nil
	}
	return json.Unmarshal(data, &fs.RWX)
}

func (r *ReadWrapper) UnmarshalJSON(data []byte) error {
	r.Type = UNDEFINED
	if ttype, err := strconv.ParseBool(string(data)); err == nil {
		r.Type = DENIED
		if ttype {
			r.Type = ALLOWED
		}
		return nil
	}
	return json.Unmarshal(data, &r.Entries)
}

func (w *WriteWrapper) UnmarshalJSON(data []byte) error {
	w.Type = UNDEFINED
	if ttype, err := strconv.ParseBool(string(data)); err == nil {
		w.Type = DENIED
		if ttype {
			w.Type = ALLOWED
		}
		return nil
	}
	return json.Unmarshal(data, &w.Entries)
}

func (e *ExecWrapper) UnmarshalJSON(data []byte) error {
	e.Type = UNDEFINED
	if ttype, err := strconv.ParseBool(string(data)); err == nil {
		e.Type = DENIED
		if ttype {
			e.Type = ALLOWED
		}
		return nil
	}
	return json.Unmarshal(data, &e.Entries)
}
