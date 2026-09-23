const HOST = process.env.SONAR_HOST_URL || "https://sonarcloud.io";
const PROJECT = process.env.SONAR_PROJECT_KEY;
const TOKEN = process.env.SONAR_TOKEN || "";

if (!PROJECT) {
  console.error("SONAR_PROJECT_KEY is not set");
  process.exit(1);
}

// Ratings are reported as numbers: 1=A, 2=B, 3=C, 4=D, 5=E
const RATING_LETTERS = { 1: "A", 2: "B", 3: "C", 4: "D", 5: "E" };
const num = (name, fallback) => Number(process.env[name] ?? fallback);

const THRESHOLDS = [
  {
    metric: "coverage",
    label: "Coverage",
    limit: num("MIN_COVERAGE", 44),
    compare: (value, limit) => value >= limit,
    describe: (limit) => `at least ${limit}%`,
    format: (value) => `${value}%`,
  },
  {
    metric: "duplicated_lines_density",
    label: "Duplicated lines",
    limit: num("MAX_DUPLICATION", 3),
    compare: (value, limit) => value <= limit,
    describe: (limit) => `at most ${limit}%`,
    format: (value) => `${value}%`,
  },
  {
    metric: "sqale_rating",
    label: "Maintainability",
    limit: num("MAX_MAINTAINABILITY_RATING", 1),
    compare: (value, limit) => value <= limit,
    describe: (limit) => `${RATING_LETTERS[limit]} or better`,
    format: (value) => RATING_LETTERS[value] ?? String(value),
  },
  {
    metric: "reliability_rating",
    label: "Reliability",
    limit: num("MAX_RELIABILITY_RATING", 4),
    compare: (value, limit) => value <= limit,
    describe: (limit) => `${RATING_LETTERS[limit]} or better`,
    format: (value) => RATING_LETTERS[value] ?? String(value),
  },
  {
    metric: "security_rating",
    label: "Security",
    limit: num("MAX_SECURITY_RATING", 3),
    compare: (value, limit) => value <= limit,
    describe: (limit) => `${RATING_LETTERS[limit]} or better`,
    format: (value) => RATING_LETTERS[value] ?? String(value),
  },
];

const metricKeys = THRESHOLDS.map((t) => t.metric).join(",");
const url = `${HOST}/api/measures/component?component=${encodeURIComponent(PROJECT)}&metricKeys=${metricKeys}`;

const headers = TOKEN
  ? { Authorization: "Basic " + Buffer.from(`${TOKEN}:`).toString("base64") }
  : {};

let payload;
try {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    console.error(`SonarCloud measures request failed: HTTP ${response.status}`);
    process.exit(1);
  }
  payload = await response.json();
} catch (error) {
  console.error(`Could not reach SonarCloud: ${error.message}`);
  process.exit(1);
}

const measured = new Map(
  (payload.component?.measures ?? []).map((m) => [m.metric, Number(m.value)])
);

let failures = 0;

console.log("Overall-code thresholds (enforced by the pipeline):");
for (const threshold of THRESHOLDS) {
  const value = measured.get(threshold.metric);

  if (value === undefined || Number.isNaN(value)) {
    console.log(`  SKIP  ${threshold.label}: not reported by SonarCloud`);
    continue;
  }

  const passed = threshold.compare(value, threshold.limit);
  if (!passed) failures += 1;

  console.log(
    `  ${passed ? "PASS" : "FAIL"}  ${threshold.label}: ${threshold.format(value)} ` +
      `(requires ${threshold.describe(threshold.limit)})`
  );
}

if (failures > 0) {
  console.error(`\n${failures} overall-code threshold(s) breached`);
  process.exit(1);
}

console.log("\nAll overall-code thresholds met");