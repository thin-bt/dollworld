# Role1 GPT-only A2 response-body byte measurement contract

state: GPT_ONLY_TEST_DESIGN_READY
source-lineage: thin-bt/dollworld master
scope: PERF-PERSON-DETAIL-BROWSER-MEASURE-20260930-A2
date: 2026-10-03

## Material finding

The canonical A2 plan fixes latency populations and percentiles but does not define which bytes are counted. HTTP transfer size, Content-Length, decoded JSON string length, and JavaScript string length are not interchangeable. For A2, measure actual response-body bytes exposed to Playwright for Person Detail data requests attributed to one measured open. Static page assets and protocol/header overhead are outside this metric.

| id | deterministic requirement | rejection code |
|---|---|---|
| PD-BYTES-01 | classify only the selected Person Detail request and optional related-identity request(s) belonging to the measured open; HTML, JS, CSS, fonts, images, source maps, setup traffic, and warm-prime traffic are excluded | byte-request-scope-invalid |
| PD-BYTES-02 | obtain each classified Playwright response body as bytes and record Buffer/Uint8Array byteLength; do not use JavaScript string length, reserialized parsed JSON, or Content-Length as measured body size | body-byte-source-invalid |
| PD-BYTES-03 | accepted-open bodyBytes is the arithmetic sum of all classified successful response-body byte lengths for that open; R=0 contains selected-detail bytes only, while R>0 also includes matching identity response(s) | body-byte-sum-invalid |
| PD-BYTES-04 | persist per-response {requestClass,urlPath,status,bodyBytes} plus per-open requestCount and bodyBytes so aggregates are independently recomputable | byte-ledger-mismatch |
| PD-BYTES-05 | requestCount is classified network requests actually issued for the measured open, not unique URLs or successful responses; duplicate/retry requests remain visible | request-count-reinterpreted |
| PD-BYTES-06 | every expected selected/identity data request for an accepted open needs an attributable readable response body; inability to read it makes the attempt non-accepted rather than synthesizing zero bytes | classified-body-unreadable |
| PD-BYTES-07 | calculate byte p50/p95 independently for each complete (side,mode) population from the same 20 accepted opens used by latency; numeric ascending sort, p50=sorted[9], p95=sorted[18], no interpolation | byte-percentile-recompute-mismatch |
| PD-BYTES-08 | before/after byte verdicts are mode-matched only and require both paired populations to pass population, mode, byte, and evidence validation; never compare partial populations or cold against warm | byte-comparison-not-admissible |

Persist acceptedBodyBytesRaw, acceptedBodyBytesSorted, bodyBytesP50, and bodyBytesP95 beside latency arrays. The raw byte array must equal accepted attempt rows' recomputed bodyBytes in accepted-index order. Body-byte values are non-negative integers and sorted arrays preserve duplicates.

This is response-body size, not wire-transfer size. Compression framing, HTTP headers, TCP/TLS overhead, encoded-data-length counters, and Content-Length are diagnostics only. They must not replace the body-byte metric.

Validation order for each population is PD-POP-01..06 -> PD-MODE-01..08 -> PD-BYTES-01..08 -> PD-VALIDATE-01..10. Missing body rows cannot be reconstructed from aggregate totals.
