import { runMockScenarios } from "../lib/mocks/scenarios";

const results = runMockScenarios();
const failed = results.filter((result) => !result.passed);

for (const result of results) {
  const status = result.passed ? "PASS" : "FAIL";
  console.log(`[${status}] ${result.scenario} (${result.detail})`);
}

if (failed.length > 0) {
  process.exit(1);
}
