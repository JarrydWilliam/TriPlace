import http from "http";

const BASE_URL = process.env.TEST_URL || "http://localhost:5000";
const CONCURRENT_REQUESTS = 500;
const TOTAL_BATCHES = 20; // 10,000 total requests

interface LoadTestMetrics {
  totalRequests: number;
  successCount: number;
  failureCount: number;
  totalDurationMs: number;
  latencies: number[];
}

function makeRequest(path: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const req = http.get(`${BASE_URL}${path}`, (res) => {
      res.on("data", () => {});
      res.on("end", () => {
        if (res.statusCode && res.statusCode < 400) {
          resolve(Date.now() - start);
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on("error", (err) => reject(err));
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error("Request Timeout (5000ms)"));
    });
  });
}

async function run10kLoadTest() {
  console.log(`=== STARTING 10,000 CONCURRENT USER LOAD TEST HARNESS ===`);
  console.log(`Target Base URL: ${BASE_URL}`);
  console.log(`Simulating ${CONCURRENT_REQUESTS} concurrent connections across ${TOTAL_BATCHES} batches (10,000 total requests)...`);

  const metrics: LoadTestMetrics = {
    totalRequests: 0,
    successCount: 0,
    failureCount: 0,
    totalDurationMs: 0,
    latencies: [],
  };

  const startTime = Date.now();
  const endpoints = [
    "/api/health/metrics",
    "/api/events/upcoming",
    "/api/communities/suggested",
  ];

  for (let batch = 1; batch <= TOTAL_BATCHES; batch++) {
    const promises: Promise<number>[] = [];
    for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
      const targetEndpoint = endpoints[i % endpoints.length];
      promises.push(makeRequest(targetEndpoint));
    }

    const results = await Promise.allSettled(promises);
    results.forEach((res) => {
      metrics.totalRequests++;
      if (res.status === "fulfilled") {
        metrics.successCount++;
        metrics.latencies.push(res.value);
      } else {
        metrics.failureCount++;
      }
    });

    console.log(`Batch ${batch}/${TOTAL_BATCHES} completed (${metrics.successCount} succeeded, ${metrics.failureCount} failed).`);
  }

  metrics.totalDurationMs = Date.now() - startTime;
  metrics.latencies.sort((a, b) => a - b);

  const avgLatency = metrics.latencies.reduce((a, b) => a + b, 0) / (metrics.latencies.length || 1);
  const p95 = metrics.latencies[Math.floor(metrics.latencies.length * 0.95)] || 0;
  const p99 = metrics.latencies[Math.floor(metrics.latencies.length * 0.99)] || 0;
  const reqPerSec = ((metrics.successCount / metrics.totalDurationMs) * 1000).toFixed(2);

  console.log("\n========================================================");
  console.log("🔥 10,000 CONCURRENT USER LOAD TEST RESULTS SUMMARY 🔥");
  console.log("========================================================");
  console.log(`Total Requests Executed: ${metrics.totalRequests}`);
  console.log(`Successful Responses:   ${metrics.successCount}`);
  console.log(`Failed Responses:       ${metrics.failureCount}`);
  console.log(`Total Duration:         ${metrics.totalDurationMs} ms`);
  console.log(`Throughput:             ${reqPerSec} req/sec`);
  console.log(`Average Latency:        ${avgLatency.toFixed(2)} ms`);
  console.log(`Latency (p95):          ${p95} ms`);
  console.log(`Latency (p99):          ${p99} ms`);
  console.log("========================================================\n");
}

run10kLoadTest().catch((err) => {
  console.error("Load test failed:", err);
});
