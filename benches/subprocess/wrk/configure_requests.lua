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

-- Read configuration file
local config_path = os.getenv("config")
local config_content = read_file(config_path, "r")
local config = cjson.decode(config_content)

local command = config.command
local content = read_file(config.file, "rb")
benchmark_ouput_path = os.getenv("output") .. "/" .. config.benchmark_output

-- Prepare request
local Boundary = "RandomBoundaryOfMyChosing"
local BodyBoundary = "--" .. Boundary
local LastBoundary = "--" .. Boundary .. "--"
local CRLF = "\r\n"

wrk.method = "POST"
wrk.headers["Content-Type"] = "multipart/form-data; boundary=" .. Boundary
wrk.body = BodyBoundary .. CRLF ..
           'Content-Disposition: form-data; name="command";' .. CRLF .. CRLF ..
           command .. CRLF ..
           BodyBoundary .. CRLF ..
           'Content-Disposition: form-data; name="file"; filename="sample-image.jpg"' .. CRLF ..
           'Content-Type: application/octet-stream' .. CRLF .. CRLF ..
           content .. CRLF ..
           LastBoundary
