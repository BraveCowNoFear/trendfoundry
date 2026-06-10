import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "dist", "agent-watch");
const outJson = path.join(outDir, "agent-watch.json");
const outHtml = path.join(outDir, "index.html");

async function readJsonIfExists(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item?.[key] || "unknown";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function stepStatus(steps, name) {
  const step = [...steps].reverse().find((item) => item.name === name);
  return step?.status || "unknown";
}

function healthStatus({ failed = 0, blockers = 0, warnings = 0 }) {
  if (failed > 0 || blockers > 0) return "blocked";
  if (warnings > 0) return "attention";
  return "clear";
}

function humanQueueItem({ type, priority, status, need, why, owner, evidencePath, unlocks }) {
  return { type, priority, status, need, why, owner, evidencePath, unlocks };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderList(items) {
  if (!items?.length) return "<li>None</li>";
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function renderTags(tags) {
  return tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
}

const ops = await readJsonIfExists(path.join(root, "dist", "ops-report", "ops-report.json"), {});
const latest = await readJsonIfExists(path.join(root, "data", "latest.json"), {});
const leads = await readJsonIfExists(path.join(root, "data", "leads.json"), { leads: [] });
const run = await readJsonIfExists(path.join(root, "dist", "ops-run", "latest-run.json"), { steps: [] });
const qa = await readJsonIfExists(path.join(root, "dist", "qa", "latest-qa.json"), {});
const contentOps = await readJsonIfExists(path.join(root, "dist", "content-ops", "latest-run.json"), {});
const emailOrders = await readJsonIfExists(path.join(root, "dist", "email-order-intake", "orders.json"), { orders: [] });
const emailFulfillment = await readJsonIfExists(path.join(root, "dist", "email-fulfillment", "email-orders.json"), { prepared: [] });
const authConfig = await readJsonIfExists(path.join(root, "site", "auth", "auth.config.json"), { brokerBaseUrl: "", providers: {} });
const commerce = await readJsonIfExists(path.join(root, "dist", "commerce", "products.json"), { products: [] });
const paymentRail = await readJsonIfExists(path.join(root, "dist", "payment-rails", "readiness.json"), { readyForHostedCheckout: false, configuredCount: 0, productCount: 0 });
const outreachExport = await readJsonIfExists(path.join(root, "dist", "content-outreach-export", "manifest.json"), { draftCount: 0, recommendedVariantCount: 0 });

const steps = run.steps || [];
const leadRows = leads.leads || [];
const emailOrderRows = emailOrders.orders || [];
const paidEmailOrders = emailOrderRows.filter((order) => order.stage === "paid_needs_fulfillment");
const unpaidEmailOrders = emailOrderRows.filter((order) => order.stage !== "paid_needs_fulfillment");
const paidLeads = leadRows.filter((lead) => lead.stage === "paid");
const qualifiedLeads = leadRows.filter((lead) => lead.stage === "qualified");
const qaFailed = Number(qa.failed || 0);
const sourceErrors = Number(ops.product?.errorCount ?? latest.errorCount ?? 0);
const activeDeals = Number(ops.content?.activeDeals || 0);
const customerDueNow = Number(ops.content?.customerDueNow || 0);
const crmDueToday = Number(ops.content?.crmDueToday || 0);
const authConfigured = Boolean(authConfig.brokerBaseUrl) && Object.values(authConfig.providers || {}).some((provider) => provider.enabled && provider.clientId);
const commerceReady = Number(ops.assets?.commerceProductCount ?? commerce.products?.length ?? 0) >= 3;
const paymentRailReady = Boolean(paymentRail.readyForHostedCheckout);
const outreachExportDrafts = Number(outreachExport.draftCount || 0);

const humanQueue = [
  humanQueueItem({
    type: "Payment rail",
    priority: paymentRailReady ? "Low" : commerceReady ? "High" : "Medium",
    status: paymentRailReady ? "Configured" : "Needs external account",
    need: paymentRailReady ? "Hosted checkout links are configured for all current commerce SKUs." : "Hosted checkout, invoice provider, or payment account connection is still outside the autonomous local pipeline.",
    why: paymentRailReady ? "Payment reply drafts can insert the configured private checkout link after review." : "Agents can draft payment replies and buyer packages, but cannot collect money without an approved payment rail.",
    owner: "Human only if the business wants fully unattended checkout.",
    evidencePath: "dist/payment-rails/readiness.json",
    unlocks: "Real paid orders without manual invoice handling."
  }),
  humanQueueItem({
    type: "Payment verification",
    priority: paidEmailOrders.length || paidLeads.length ? "Critical" : "Low",
    status: paidEmailOrders.length || paidLeads.length ? "Waiting" : "Idle",
    need: paidEmailOrders.length || paidLeads.length ? "Verify payment before delivery." : "No paid order is waiting right now.",
    why: "Fulfillment scripts prepare local delivery drafts only after a paid signal exists.",
    owner: "Payment agent, with external confirmation if no payment API exists.",
    evidencePath: "dist/email-order-intake/",
    unlocks: "Buyer delivery package generation."
  }),
  humanQueueItem({
    type: "Buyer input",
    priority: unpaidEmailOrders.length || qualifiedLeads.length ? "Medium" : "Low",
    status: unpaidEmailOrders.length || qualifiedLeads.length ? "Waiting" : "Idle",
    need: unpaidEmailOrders.length || qualifiedLeads.length ? "Buyer niche, channel, or reply is waiting in the order pipe." : "No buyer input is waiting right now.",
    why: "Agents can parse copied orders and issue requests, but they cannot invent buyer intent.",
    owner: "Sales intake agent.",
    evidencePath: "data/email-orders/",
    unlocks: "Payment reply or sample package routing."
  }),
  humanQueueItem({
    type: "Account access",
    priority: authConfigured ? "Low" : "Medium",
    status: authConfigured ? "Configured" : "Not configured",
    need: authConfigured ? "No immediate account or password request." : "OAuth/login broker is not connected for a gated product room.",
    why: "The public static product can sell by email/GitHub, but gated customer access needs external provider credentials.",
    owner: "Access broker agent.",
    evidencePath: "site/auth/auth.config.json",
    unlocks: "Self-serve customer login."
  }),
  humanQueueItem({
    type: "Launch review",
    priority: "Medium",
    status: "Drafted for review",
    need: "Launch posts and one-to-one outreach drafts are ready, but not auto-sent.",
    why: "The project keeps outreach drafts local to avoid accidental spam or unsupported claims.",
    owner: "Growth agent.",
    evidencePath: "dist/launch-assets/ and dist/outreach-drafts/",
    unlocks: "Traffic and first buyer conversations."
  }),
  humanQueueItem({
    type: "Outreach send review",
    priority: outreachExportDrafts ? "High" : "Low",
    status: outreachExportDrafts ? "Waiting" : "Idle",
    need: outreachExportDrafts ? `${outreachExportDrafts} reviewed draft(s) ready for manual recipient and send.` : "No reviewed draft is waiting for manual send right now.",
    why: "Drafts ship with empty From/To headers; the human reviewer must add the verified recipient address before sending.",
    owner: "Growth agent.",
    evidencePath: "dist/content-outreach-export/drafts.md",
    unlocks: "First reply, deal, or paid order from the gate-passed batch."
  }),
  humanQueueItem({
    type: "Startup funds",
    priority: "Low",
    status: "Not required",
    need: "No required startup capital detected for the current static-site/email-order model.",
    why: "Current operations use public sources, GitHub Pages, local scripts, and manual payment drafts.",
    owner: "Ops agent.",
    evidencePath: "docs/operations.md",
    unlocks: "Optional paid ads or paid data sources later."
  })
];

const blockers = humanQueue.filter((item) => ["Critical", "High"].includes(item.priority) && !["Idle", "Configured", "Not required"].includes(item.status));
const agentCards = [
  {
    name: "Coordinator",
    mandate: "Watch every lane and escalate only true human dependency.",
    status: healthStatus({ blockers: blockers.length }),
    lastStep: run.status || "unknown",
    humanNeed: blockers.length ? `${blockers.length} high-priority dependency item(s).` : "No immediate human action is blocking today's local loop.",
    autonomousNext: "Keep refreshing the dashboard after each operate run.",
    evidencePath: "dist/agent-watch/index.html",
    tags: ["supervision", "requirements", "handoff"]
  },
  {
    name: "Signal Builder",
    mandate: "Collect public signals and rebuild the sellable product page.",
    status: healthStatus({ warnings: sourceErrors > 0 ? 1 : 0 }),
    lastStep: stepStatus(steps, "daily"),
    humanNeed: sourceErrors > 3 ? "Source failures need source list or rate-limit strategy." : "No account, password, or funding request.",
    autonomousNext: "Run npm run daily or the full operate loop.",
    evidencePath: "data/latest.json",
    tags: ["collection", "site", "feeds"]
  },
  {
    name: "Content Product Agent",
    mandate: "Generate buyer-ready scripts, evidence packs, outreach review, and deal support.",
    status: healthStatus({ failed: contentOps.status === "failed" ? 1 : 0 }),
    lastStep: stepStatus(steps, "content-ops"),
    humanNeed: activeDeals || customerDueNow ? "Review active deal/customer follow-up drafts before sending." : "No buyer-facing send action needed right now.",
    autonomousNext: "Refresh content packs and health gates.",
    evidencePath: "dist/content-ops/latest-run.json",
    tags: ["buyer pack", "deal desk", "customer success"]
  },
  {
    name: "Commerce Agent",
    mandate: "Prepare SKU fields, payment replies, and listing copy.",
    status: commerceReady ? "attention" : "blocked",
    lastStep: stepStatus(steps, "commerce"),
    humanNeed: paymentRailReady ? "Hosted checkout links are configured; no payment-rail setup request." : "Needs an external payment rail for fully unattended checkout.",
    autonomousNext: paymentRailReady ? "Use configured payment rail in payment reply drafts after review." : "Keep SKU fields and invoice drafts ready.",
    evidencePath: paymentRailReady ? "dist/payment-rails/readiness.json" : "dist/commerce/products.json",
    tags: ["payment", "SKU", "checkout"]
  },
  {
    name: "Lead Intake Agent",
    mandate: "Sync GitHub leads and parse copied email orders.",
    status: healthStatus({ warnings: unpaidEmailOrders.length + qualifiedLeads.length }),
    lastStep: `${stepStatus(steps, "leads")} / ${stepStatus(steps, "intake-email-orders")}`,
    humanNeed: unpaidEmailOrders.length || qualifiedLeads.length ? "Buyer intent is waiting in the pipeline." : "No buyer input waiting.",
    autonomousNext: "Parse new local order files and produce payment replies.",
    evidencePath: "dist/email-order-intake/orders.json",
    tags: ["leads", "email", "CRM"]
  },
  {
    name: "Fulfillment Agent",
    mandate: "Generate buyer-only delivery folders after paid status.",
    status: healthStatus({ warnings: paidEmailOrders.length + paidLeads.length }),
    lastStep: `${stepStatus(steps, "fulfill-email-orders")} / ${stepStatus(steps, "fulfill-ready")}`,
    humanNeed: paidEmailOrders.length || paidLeads.length ? "Payment confirmation required before release." : "No paid delivery waiting.",
    autonomousNext: "Prepare local buyer package when paid signal is present.",
    evidencePath: "dist/email-fulfillment/email-orders.json",
    tags: ["delivery", "orders", "buyer-only"]
  },
  {
    name: "Growth Agent",
    mandate: "Prepare launch posts and one-to-one outreach drafts.",
    status: "attention",
    lastStep: stepStatus(steps, "launch-assets"),
    humanNeed: "Drafts exist, but outbound posting/sending is not automated.",
    autonomousNext: "Refresh draft assets and keep claims bounded.",
    evidencePath: "dist/launch-assets/launch-posts.md",
    tags: ["launch", "outreach", "traffic"]
  },
  {
    name: "QA Agent",
    mandate: "Block regressions, leaks, bad deliverables, and broken pages.",
    status: healthStatus({ failed: qaFailed }),
    lastStep: stepStatus(steps, "qa"),
    humanNeed: qaFailed ? "Fix failing checks before selling." : "No human help needed.",
    autonomousNext: "Run npm run qa after each operate cycle.",
    evidencePath: "dist/qa/latest-qa.md",
    tags: ["quality", "bounds", "release"]
  }
];

const requirements = [
  {
    id: "REQ-001",
    text: "Act as the human-dependency supervisor for the money-making agent system.",
    status: "active"
  },
  {
    id: "REQ-002",
    text: "Coordinate with worker agents and surface only account, password, payment, funding, buyer-input, or human-review needs.",
    status: "active"
  },
  {
    id: "REQ-003",
    text: "Do not ask humans for the agent's own technical problems; solve those inside the agent system.",
    status: "active"
  },
  {
    id: "REQ-004",
    text: "Use an HTML dashboard that can be regenerated whenever requirements or project state changes.",
    status: "active"
  },
  {
    id: "REQ-005",
    text: "Keep sensitive data out of the dashboard; show only aggregate operational status and file paths.",
    status: "active"
  }
];

const payload = {
  generatedAt: new Date().toISOString(),
  project: "TrendFoundry",
  mission: "Autonomous revenue supervision dashboard",
  headline: {
    status: blockers.length ? "attention" : "clear",
    text: blockers.length ? "Human-level dependencies exist." : "No immediate high-priority human dependency is blocking local operations.",
    detail: blockers.length
      ? blockers.map((item) => `${item.type}: ${item.need}`).join(" ")
      : "The system can keep collecting, building, drafting, fulfilling eligible local orders, and QA-checking without asking for technical help."
  },
  metrics: {
    totalSignals: ops.product?.totalItems ?? latest.totalItems ?? 0,
    currentCards: ops.product?.currentCards ?? Math.min(12, latest.items?.length || 0),
    sourceErrors,
    qaPassed: qa.passed ?? ops.qa?.latest?.passed ?? 0,
    qaTotal: qa.total ?? ops.qa?.latest?.total ?? 0,
    leads: leadRows.length,
    leadStages: countBy(leadRows, "stage"),
    emailOrders: emailOrderRows.length,
    paidEmailOrders: paidEmailOrders.length,
    commerceProducts: ops.assets?.commerceProductCount ?? commerce.products?.length ?? 0,
    paymentRailConfigured: paymentRail.configuredCount || 0,
    paymentRailProducts: paymentRail.productCount || 0,
    crmDueToday,
    activeDeals,
    customerDueNow,
    preparedEmailFulfillments: emailFulfillment.prepared?.length || 0
    ,
    outreachExportDrafts,
    outreachExportRecommended: Number(outreachExport.recommendedVariantCount || 0)
  },
  agents: agentCards,
  humanQueue,
  requirements,
  refresh: {
    command: "npm run agent-watch",
    operateCommand: "npm run operate",
    serveCommand: "powershell -NoProfile -Command \"$env:SITE_DIR='dist/agent-watch'; $env:PORT='4175'; npm start\"",
    localUrl: "http://localhost:4175"
  }
};

function renderHtml(snapshot) {
  const data = JSON.stringify(snapshot).replace(/</g, "\\u003c");
  const agentRows = snapshot.agents
    .map((agent) => `
      <article class="panel agent ${escapeHtml(agent.status)}">
        <div class="panel-head">
          <div>
            <p class="eyebrow">${escapeHtml(agent.lastStep)}</p>
            <h2>${escapeHtml(agent.name)}</h2>
          </div>
          <span class="status">${escapeHtml(agent.status)}</span>
        </div>
        <p>${escapeHtml(agent.mandate)}</p>
        <dl>
          <div><dt>Human dependency</dt><dd>${escapeHtml(agent.humanNeed)}</dd></div>
          <div><dt>Autonomous next</dt><dd>${escapeHtml(agent.autonomousNext)}</dd></div>
          <div><dt>Evidence</dt><dd>${escapeHtml(agent.evidencePath)}</dd></div>
        </dl>
        <div class="tags">${renderTags(agent.tags)}</div>
      </article>`)
    .join("");
  const queueRows = snapshot.humanQueue
    .map((item) => `
      <tr>
        <td><strong>${escapeHtml(item.type)}</strong><span>${escapeHtml(item.owner)}</span></td>
        <td><mark class="${escapeHtml(item.priority.toLowerCase())}">${escapeHtml(item.priority)}</mark></td>
        <td>${escapeHtml(item.status)}</td>
        <td>${escapeHtml(item.need)}<small>${escapeHtml(item.why)}</small></td>
        <td>${escapeHtml(item.evidencePath)}</td>
      </tr>`)
    .join("");
  const requirementRows = snapshot.requirements
    .map((item) => `<li><strong>${escapeHtml(item.id)}</strong><span>${escapeHtml(item.text)}</span><em>${escapeHtml(item.status)}</em></li>`)
    .join("");
  const metricCards = [
    ["Signals", snapshot.metrics.totalSignals],
    ["Cards", snapshot.metrics.currentCards],
    ["QA", `${snapshot.metrics.qaPassed}/${snapshot.metrics.qaTotal}`],
    ["Leads", snapshot.metrics.leads],
    ["Email orders", snapshot.metrics.emailOrders],
    ["Paid email", snapshot.metrics.paidEmailOrders],
    ["CRM due", snapshot.metrics.crmDueToday],
    ["Source errors", snapshot.metrics.sourceErrors]
  ]
    .map(([label, value]) => `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`)
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TrendFoundry Agent Watch</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #151515;
      --muted: #5d635f;
      --line: #d9ddd8;
      --paper: #f7f5f0;
      --panel: #ffffff;
      --clear: #19724a;
      --attention: #a15f00;
      --blocked: #b3261e;
      --blue: #315f88;
      --shadow: 0 18px 50px rgba(34, 36, 34, 0.08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--paper);
      color: var(--ink);
      letter-spacing: 0;
    }
    main { max-width: 1180px; margin: 0 auto; padding: 32px 20px 52px; }
    header {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.6fr);
      gap: 20px;
      align-items: end;
      margin-bottom: 20px;
    }
    h1, h2, h3, p { margin: 0; }
    h1 { font-size: clamp(2rem, 5vw, 4.9rem); line-height: 0.95; max-width: 860px; }
    h2 { font-size: 1.05rem; line-height: 1.25; }
    h3 { font-size: 1rem; }
    p { color: var(--muted); line-height: 1.6; }
    .eyebrow {
      color: var(--blue);
      font-size: 0.76rem;
      font-weight: 760;
      letter-spacing: 0;
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .hero-note {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: var(--shadow);
      padding: 18px;
    }
    .hero-note strong { display: block; font-size: 1.1rem; margin-bottom: 8px; }
    .hero-note.clear strong { color: var(--clear); }
    .hero-note.attention strong { color: var(--attention); }
    .hero-note.blocked strong { color: var(--blocked); }
    .metrics {
      display: grid;
      grid-template-columns: repeat(8, minmax(0, 1fr));
      gap: 10px;
      margin: 18px 0 28px;
    }
    .metric {
      min-height: 88px;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .metric span { color: var(--muted); font-size: 0.78rem; }
    .metric strong { font-size: 1.45rem; }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }
    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 18px;
      box-shadow: 0 10px 32px rgba(34, 36, 34, 0.045);
    }
    .panel-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }
    .status, mark {
      border-radius: 999px;
      padding: 4px 9px;
      font-size: 0.74rem;
      font-weight: 760;
      white-space: nowrap;
    }
    .status { background: #eef2ef; color: var(--muted); }
    .clear .status { background: #e5f3ec; color: var(--clear); }
    .attention .status { background: #fff0d7; color: var(--attention); }
    .blocked .status { background: #fde7e5; color: var(--blocked); }
    dl { display: grid; gap: 10px; margin: 16px 0 0; }
    dt { color: var(--muted); font-size: 0.76rem; margin-bottom: 3px; }
    dd { margin: 0; line-height: 1.45; }
    .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
    .tag {
      border: 1px solid var(--line);
      border-radius: 999px;
      color: var(--muted);
      padding: 4px 8px;
      font-size: 0.74rem;
    }
    section { margin-top: 28px; }
    .table-wrap {
      overflow-x: auto;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 860px;
    }
    th, td {
      text-align: left;
      padding: 13px 14px;
      border-bottom: 1px solid var(--line);
      vertical-align: top;
      line-height: 1.45;
    }
    th { color: var(--muted); font-size: 0.78rem; font-weight: 760; }
    td span, td small { display: block; color: var(--muted); margin-top: 4px; }
    tr:last-child td { border-bottom: 0; }
    mark { background: #eef2ef; color: var(--muted); }
    mark.critical, mark.high { background: #fde7e5; color: var(--blocked); }
    mark.medium { background: #fff0d7; color: var(--attention); }
    mark.low { background: #e5f3ec; color: var(--clear); }
    .requirements {
      list-style: none;
      display: grid;
      gap: 10px;
      margin: 0;
      padding: 0;
    }
    .requirements li {
      display: grid;
      grid-template-columns: 90px minmax(0, 1fr) 80px;
      gap: 12px;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px;
      align-items: center;
    }
    .requirements span { color: var(--muted); line-height: 1.45; }
    .requirements em { color: var(--clear); font-style: normal; text-align: right; }
    footer {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 18px;
      margin-top: 30px;
      color: var(--muted);
      font-size: 0.82rem;
    }
    code {
      background: rgba(255,255,255,0.7);
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 2px 5px;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 0.85em;
    }
    @media (max-width: 920px) {
      header, .grid { grid-template-columns: 1fr; }
      .metrics { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    }
    @media (max-width: 560px) {
      main { padding: 22px 14px 42px; }
      h1 { font-size: 2.25rem; }
      .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .requirements li { grid-template-columns: 1fr; }
      .requirements em { text-align: left; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <p class="eyebrow">Agent Watch</p>
        <h1>Human-dependency control room.</h1>
      </div>
      <aside class="hero-note ${escapeHtml(snapshot.headline.status)}">
        <strong>${escapeHtml(snapshot.headline.text)}</strong>
        <p>${escapeHtml(snapshot.headline.detail)}</p>
      </aside>
    </header>
    <div class="metrics">${metricCards}</div>
    <section>
      <p class="eyebrow">Worker agents</p>
      <div class="grid">${agentRows}</div>
    </section>
    <section>
      <p class="eyebrow">Human dependency queue</p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Need</th><th>Priority</th><th>Status</th><th>Why it matters</th><th>Evidence</th></tr>
          </thead>
          <tbody>${queueRows}</tbody>
        </table>
      </div>
    </section>
    <section>
      <p class="eyebrow">Current requirements</p>
      <ul class="requirements">${requirementRows}</ul>
    </section>
    <footer>
      <span>Refresh data: <code>${escapeHtml(snapshot.refresh.command)}</code></span>
      <span>Full loop: <code>${escapeHtml(snapshot.refresh.operateCommand)}</code></span>
      <span>Serve: <code>${escapeHtml(snapshot.refresh.serveCommand)}</code></span>
      <span>Generated: <time>${escapeHtml(snapshot.generatedAt)}</time></span>
    </footer>
  </main>
  <script>
    window.__AGENT_WATCH__ = ${data};
    async function refreshSnapshot() {
      try {
        const response = await fetch("./agent-watch.json?ts=" + Date.now(), { cache: "no-store" });
        if (!response.ok) return;
        const next = await response.json();
        const current = window.__AGENT_WATCH__;
        if (next.generatedAt && next.generatedAt !== current.generatedAt) {
          window.location.reload();
        }
      } catch {
        // Static file usage can block fetch; the embedded snapshot remains usable.
      }
    }
    setInterval(refreshSnapshot, 15000);
  </script>
</body>
</html>
`;
}

await mkdir(outDir, { recursive: true });
await writeFile(outJson, JSON.stringify(payload, null, 2), "utf8");
await writeFile(outHtml, renderHtml(payload), "utf8");

console.log(`Wrote ${outHtml}`);
