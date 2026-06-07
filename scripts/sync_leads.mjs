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

console.log(`Synced ${leads.length} TrendFoundry leads from ${owner}/${repo}`);
