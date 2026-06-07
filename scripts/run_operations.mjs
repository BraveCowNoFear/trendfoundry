import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const isWindows = process.platform === "win32";
const runSocial = process.argv.includes("--with-social") || !existsSync(path.join(root, "site", "og-image.png"));
const distDir = path.join(root, "dist", "ops-run");

function runStep(name, args) {
  const startedAt = new Date().toISOString();
  console.log(`\n[TrendFoundry operate] ${name} started`);
  const command = isWindows ? "cmd.exe" : "npm";
  const commandArgs = isWindows ? ["/d", "/s", "/c", ["npm", "run", ...args].join(" ")] : ["run", ...args];
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    stdio: "inherit",
    shell: false
  });
  const finishedAt = new Date().toISOString();
  if (result.status !== 0) {
    const detail = result.error ? `: ${result.error.message}` : "";
    throw new Error(`${name} failed with exit code ${result.status}${detail}`);
  }
  console.log(`[TrendFoundry operate] ${name} finished`);
  return { name, startedAt, finishedAt, status: "success" };
}

const steps = [];
try {
  if (runSocial) {
    steps.push(runStep("social", ["social"]));
  }
  steps.push(runStep("daily", ["daily"]));
  steps.push(runStep("commerce", ["commerce"]));
  steps.push(runStep("leads", ["leads"]));
  steps.push(runStep("fulfill-ready", ["fulfill-ready"]));
  steps.push(runStep("launch-assets", ["launch-assets"]));
  steps.push(runStep("ops-report", ["ops-report"]));
  steps.push(runStep("qa", ["qa", "--", "--skip-scheduler"]));

  await mkdir(distDir, { recursive: true });
  const summary = {
    generatedAt: new Date().toISOString(),
    mode: runSocial ? "with-social" : "standard",
    steps,
    safety: [
      "No outreach messages were sent.",
      "No payment action was attempted.",
      "No files were uploaded.",
      "No GitHub labels were changed."
    ]
  };
  await writeFile(path.join(distDir, "latest-run.json"), JSON.stringify(summary, null, 2), "utf8");
  console.log(`\n[TrendFoundry operate] wrote ${path.join(distDir, "latest-run.json")}`);
} catch (error) {
  await mkdir(distDir, { recursive: true });
  const failure = {
    generatedAt: new Date().toISOString(),
    mode: runSocial ? "with-social" : "standard",
    steps,
    error: error.message
  };
  await writeFile(path.join(distDir, "latest-run.json"), JSON.stringify(failure, null, 2), "utf8");
  throw error;
}
