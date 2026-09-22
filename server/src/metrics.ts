// Prometheus instrumentation: default Node.js process metrics, per-request
// counters and latency histograms, and an info metric reporting the running version.
// Exposed via GET /metrics for Prometheus to scrape.

import type { Request, Response, NextFunction } from "express";
import { collectDefaultMetrics, Counter, Gauge, Histogram, register } from "prom-client";
import { config } from "./config.js";

export { register };

// CPU, memory, event-loop lag, GC and other Node.js process metrics
collectDefaultMetrics({ register });

// Reports which build is running, so a release can be verified from monitoring
const appInfo = new Gauge({
  name: "app_info",
  help: "Running application version (value is always 1)",
  labelNames: ["version"] as const,
});
appInfo.set({ version: config.appVersion }, 1);

const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total HTTP requests handled, by method, route and status code",
  labelNames: ["method", "route", "status_code"] as const,
});

const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request latency in seconds, by method, route and status code",
  labelNames: ["method", "route", "status_code"] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

// Times every request and records it once the response has been sent
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  // Don't count Prometheus's own scrapes, or they'd dominate the request metrics
  if (req.path === "/metrics") return next();

  const stopTimer = httpRequestDuration.startTimer();

  res.on("finish", () => {
    // Label by matched route pattern rather than raw URL, keeping label cardinality bounded
    const route: string = req.route?.path ?? "unmatched";
    const labels = { method: req.method, route, status_code: String(res.statusCode) };
    httpRequestsTotal.inc(labels);
    stopTimer(labels);
  });

  next();
}