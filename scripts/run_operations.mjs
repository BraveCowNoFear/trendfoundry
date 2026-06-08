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
async function persistRun(status = "running", extra = {}) {
  await mkdir(distDir, { recursive: true });
  const summary = {
    generatedAt: new Date().toISOString(),
    mode: runSocial ? "with-social" : "standard",
    status,
    steps,
    safety: [
      "No outreach messages were sent.",
      "No payment action was attempted.",
      "No files were uploaded.",
      "No GitHub labels were changed."
    ],
    ...extra
  };
  await writeFile(path.join(distDir, "latest-run.json"), JSON.stringify(summary, null, 2), "utf8");
}

try {
  if (runSocial) {
    steps.push(runStep("social", ["social"]));
    await persistRun();
  }
  steps.push(runStep("daily", ["daily"]));
  await persistRun();
  steps.push(runStep("commerce", ["commerce"]));
  await persistRun();
  steps.push(runStep("leads", ["leads"]));
  await persistRun();
  steps.push(runStep("intake-email-orders", ["intake-email-orders"]));
  await persistRun();
  steps.push(runStep("sync-email-subscriptions", ["sync-email-subscriptions"]));
  await persistRun();
  steps.push(runStep("content-subscription", ["content-subscription"]));
  await persistRun();
  steps.push(runStep("content-subscription-crm", ["content-subscription-crm"]));
  await persistRun();
  steps.push(runStep("content-subscription-due", ["content-subscription-due"]));
  await persistRun();
  steps.push(runStep("content-subscription-retention", ["content-subscription-retention"]));
  await persistRun();
  steps.push(runStep("fulfill-email-orders", ["fulfill-email-orders"]));
  await persistRun();
  steps.push(runStep("fulfill-ready", ["fulfill-ready"]));
  await persistRun();
  steps.push(runStep("launch-assets", ["launch-assets"]));
  await persistRun();
  steps.push(runStep("ops-report", ["ops-report"]));
  await persistRun();
  steps.push(runStep("qa", ["qa", "--", "--skip-scheduler"]));
  await persistRun("success");

  console.log(`\n[TrendFoundry operate] wrote ${path.join(distDir, "latest-run.json")}`);
} catch (error) {
  await persistRun("failed", { error: error.message });
  throw error;
}
