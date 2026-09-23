// Cover Pieces test runner: pure-logic smoke + DOM regression harness. $0, no deps.
// Usage: node tests/run-tests.js   (exit 0 = all green)
const { spawnSync } = require("child_process");
const path = require("path");

const suites = [
  ["pure-logic smoke", path.join(__dirname, "smoke.js")],
  ["drag/snap/link regression", path.join(__dirname, "repro-harness.js")],
];

let failed = 0;
for (const [name, file] of suites) {
  const r = spawnSync(process.execPath, [file], { encoding: "utf8", timeout: 120000 });
  const out = (r.stdout || "") + (r.stderr || "");
  const ok = r.status === 0;
  console.log((ok ? "SUITE PASS" : "SUITE FAIL") + " | " + name + " (" + path.basename(file) + ")");
  if (!ok) { failed++; console.log(out.slice(-3000)); }
}
console.log(failed ? `\nRESULT: ${failed} suite(s) FAILED` : "\nRESULT: all suites green");
process.exit(failed ? 1 : 0);
