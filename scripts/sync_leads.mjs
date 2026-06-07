import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const owner = process.env.GITHUB_OWNER || "BraveCowNoFear";
const repo = process.env.GITHUB_REPO || "trendfoundry";
const root = process.cwd();
const dataDir = path.join(root, "data");
const docsDir = path.join(root, "docs");
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

function headers() {
  const result = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "trendfoundry-lead-sync"
  };
  if (token) {
    result.Authorization = `Bearer ${token}`;
  }
  return result;
}

async function githubJson(url) {
  const response = await fetch(url, { headers: headers() });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status} for ${url}: ${body.slice(0, 200)}`);
  }
  return response.json();
}

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseIssueForm(body = "") {
  const fields = {};
  const matches = body.matchAll(/###\s+(.+?)\r?\n\r?\n([\s\S]*?)(?=\r?\n###\s+|\s*$)/g);
  for (const match of matches) {
    const label = match[1].trim();
    const rawValue = match[2].trim();
    fields[normalizeKey(label)] = rawValue === "_No response_" ? "" : rawValue;
  }
  return fields;
}

function labelsOf(issue) {
  return (issue.labels || []).map((label) => label.name);
}

function stageFor(issue) {
  const labels = labelsOf(issue).map((label) => label.toLowerCase());
  if (labels.includes("paid")) return "paid";
  if (labels.includes("not-fit") || labels.includes("not_fit")) return "not_fit";
  if (labels.includes("qualified")) return "qualified";
  if (issue.state === "closed") return "closed";
  if (labels.includes("lead") || labels.includes("sample-pack")) return "new_lead";
  return "untriaged";
}

function nextActionFor(lead) {
  if (lead.stage === "paid") return "Deliver the current sample pack and ask for weekly brief preference.";
  if (lead.stage === "qualified") return "Send payment instructions and one tailored sample angle.";
  if (lead.stage === "not_fit") return "No action.";
  if (lead.stage === "closed") return "Review before reopening.";
  return "Validate the channel, reply with sample-pack options, then label qualified or not-fit.";
}

function priceFor(lead) {
  const wanted = String(lead.packType || "").toLowerCase();
  if (wanted.includes("49")) return "USD 49/month custom niche brief";
  if (wanted.includes("19")) return "USD 19/month weekly brief";
  return "USD 9 sample issue";
}

function safeLine(value, fallback = "your channel") {
  return String(value || fallback).replace(/\r?\n/g, " ").trim();
}

function githubReplyFor(lead) {
  if (lead.stage === "paid") {
    return `Thanks, @${lead.requester}. I will prepare the current TrendFoundry pack for ${safeLine(lead.creatorChannel)} and confirm your preferred weekly topic focus before delivery.`;
  }
  if (lead.stage === "not_fit") {
    return `Thanks, @${lead.requester}. This request does not look like a fit for the current AI/developer creator brief. I will close it for now so we do not send irrelevant material.`;
  }
  const niche = lead.niche ? ` I will bias the sample toward: ${safeLine(lead.niche)}.` : "";
  return `Thanks, @${lead.requester}. I can prepare the latest TrendFoundry ${priceFor(lead)} for ${safeLine(lead.creatorChannel)}.${niche}

What you will receive:
- 12 source-backed AI/developer video opportunities
- Bilibili and YouTube title angles
- one ready-to-record script
- opportunity CSV with quality-risk notes

Please do not post payment card details or private IDs here. Use the preferred contact route you provided for payment and delivery details.`;
}

function emailSubjectFor(lead) {
  return `TrendFoundry ${priceFor(lead)} for ${safeLine(lead.creatorChannel)}`;
}

function emailReplyFor(lead) {
  const channel = safeLine(lead.creatorChannel);
  const niche = lead.niche ? `\n\nI saw your topic preference: ${safeLine(lead.niche)}. I will use that to bias the sample selection.` : "";
  if (lead.stage === "paid") {
    return `Hi ${safeLine(lead.requester, "there")},

Thanks for ordering TrendFoundry.

I am preparing the current pack for ${channel}. It includes the Markdown brief, one ready-to-record script, opportunities CSV, and quality-risk notes.

Before I deliver the next weekly issue, please reply with the narrowest audience you want the brief to optimize for.

Best,
TrendFoundry`;
  }
  if (lead.stage === "not_fit") {
    return `Hi ${safeLine(lead.requester, "there")},

Thanks for checking out TrendFoundry. Based on the current request, this does not look like a strong fit for the AI/developer creator brief, so I do not want to sell you an irrelevant pack.

Best,
TrendFoundry`;
  }
  return `Hi ${safeLine(lead.requester, "there")},

Thanks for requesting TrendFoundry for ${channel}.

The best next step is the ${priceFor(lead)}. The current pack includes:

- 12 source-backed AI/developer video opportunities
- Bilibili and YouTube title angles
- one ready-to-record script
- opportunities CSV with quality-risk notes
- clear limitations so the ideas do not turn into low-quality AI slop${niche}

If you want to proceed, reply with the preferred payment route for delivery. Please do not send card details by email.

Best,
TrendFoundry`;
}

function issueToLead(issue) {
  const fields = parseIssueForm(issue.body || "");
  const lead = {
    issueNumber: issue.number,
    issueUrl: issue.html_url,
    title: issue.title,
    state: issue.state,
    stage: stageFor(issue),
    labels: labelsOf(issue),
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    requester: issue.user?.login || "",
    creatorChannel: fields.creator_channel_or_team || "",
    platform: fields.primary_platform || "",
    packType: fields.what_do_you_want || "",
    contact: fields.preferred_contact || "",
    niche: fields.niche_or_topic_preference || "",
    nextAction: ""
  };
  lead.nextAction = nextActionFor(lead);
  return lead;
}

function sortLeads(a, b) {
  const rank = { new_lead: 0, untriaged: 1, qualified: 2, paid: 3, closed: 4, not_fit: 5 };
  return (rank[a.stage] ?? 9) - (rank[b.stage] ?? 9) || new Date(b.updatedAt) - new Date(a.updatedAt);
}

function pipelineMarkdown(leads) {
  const generatedAt = new Date().toISOString();
  const counts = leads.reduce((acc, lead) => {
    acc[lead.stage] = (acc[lead.stage] || 0) + 1;
    return acc;
  }, {});

  const rows = leads.map((lead) => {
    const safe = (value) => String(value || "").replace(/\|/g, "/").replace(/\r?\n/g, " ");
    return `| #${lead.issueNumber} | ${safe(lead.stage)} | ${safe(lead.packType)} | ${safe(lead.platform)} | ${safe(lead.creatorChannel)} | ${safe(lead.contact)} | ${safe(lead.nextAction)} |`;
  });

  return `# TrendFoundry Lead Pipeline

Generated: ${generatedAt}

Source: https://github.com/${owner}/${repo}/issues

This file is local-only because it may contain buyer contact details.

## Stage Counts

${Object.keys(counts).length ? Object.entries(counts).map(([stage, count]) => `- ${stage}: ${count}`).join("\n") : "- No leads yet."}

## Leads

| Issue | Stage | Pack | Platform | Creator Channel | Contact | Next Action |
|---|---|---|---|---|---|---|
${rows.length ? rows.join("\n") : "| - | - | - | - | - | - | Watch for new GitHub Issue Form submissions. |"}
`;
}

function repliesMarkdown(leads) {
  const generatedAt = new Date().toISOString();
  const blocks = leads.map((lead) => `## Issue #${lead.issueNumber}: ${lead.title}

- Stage: ${lead.stage}
- Issue: ${lead.issueUrl}
- Contact: ${safeLine(lead.contact, "not provided")}
- Pack: ${safeLine(lead.packType, "not provided")}
- Next action: ${lead.nextAction}

### GitHub Reply Draft

\`\`\`text
${githubReplyFor(lead)}
\`\`\`

### Email Reply Draft

Subject: ${emailSubjectFor(lead)}

\`\`\`text
${emailReplyFor(lead)}
\`\`\`
`);

  return `# TrendFoundry Lead Reply Drafts

Generated: ${generatedAt}

This file is local-only because it may contain buyer contact details. Review before sending; do not auto-post replies.

${blocks.length ? blocks.join("\n") : "No lead replies yet. Watch for GitHub Issue Form submissions or email orders."}
`;
}

const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=100`;
const issues = await githubJson(url);
const leads = issues
  .filter((issue) => !issue.pull_request)
  .filter((issue) => {
    const labels = labelsOf(issue).map((label) => label.toLowerCase());
    return issue.title.toLowerCase().startsWith("sample pack request") || labels.includes("lead") || labels.includes("sample-pack");
  })
  .map(issueToLead)
  .sort(sortLeads);

await mkdir(dataDir, { recursive: true });
await mkdir(docsDir, { recursive: true });
await writeFile(path.join(dataDir, "leads.json"), JSON.stringify({ generatedAt: new Date().toISOString(), owner, repo, leads }, null, 2), "utf8");
await writeFile(path.join(docsDir, "lead-pipeline.md"), pipelineMarkdown(leads), "utf8");
await writeFile(path.join(docsDir, "lead-replies.md"), repliesMarkdown(leads), "utf8");

console.log(`Synced ${leads.length} TrendFoundry leads from ${owner}/${repo}`);
console.log("Wrote docs/lead-pipeline.md and docs/lead-replies.md");
