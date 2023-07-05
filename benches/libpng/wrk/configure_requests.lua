cjson = require("cjson")

function read_file(path, mode)
    local file, errorMessage = io.open(path, mode)
    if not file then
        error("Could not read the file:" .. errorMessage .. "\n")
    end

    local content = file:read "*all"
    file:close()
    return content
end

function extract_data(object)
    return {
        min = object.min,
        max = object.max,
        mean = object.mean,
        stdev = object.stdev,
        p75 = object:percentile(75),
        p99 = object:percentile(99),
        p995 = object:percentile(995),
    }
end

-- Export benchmark output
function done(summary, latency, requests)
    local file, errorMessage = io.open(benchmark_ouput_path, "w")
    if not file then
        error("Could not open the file:" .. errorMessage .. "\n")
    end

    local result = {
        summary = summary,
        latency = extract_data(latency),
        requests = extract_data(requests),
    }

    file:write(cjson.encode(result))
    file:close()
end

-- Prepare input file and output folder
local content = read_file("./input.png", "rb")
benchmark_ouput_path =  "./out/libpng_out"

-- Prepare request
local Boundary = "RandomBoundaryOfMyChosing"
local BodyBoundary = "--" .. Boundary
local LastBoundary = "--" .. Boundary .. "--"
local CRLF = "\r\n"

wrk.method = "POST"
wrk.headers["Content-Type"] = "multipart/form-data; boundary=" .. Boundary
wrk.body = BodyBoundary .. CRLF ..
           'Content-Disposition: form-data; name="file"; filename="input.png"' .. CRLF ..
           'Content-Type: application/octet-stream' .. CRLF .. CRLF ..
           content .. CRLF ..
           LastBoundary
