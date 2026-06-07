import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "content-feedback-loop");
const privateDir = path.join(root, "data", "content-sales-crm");

function compact(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim();
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows, columns) {
  return [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))].join("\n");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted && char === "\"" && next === "\"") {
      field += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => cell.length)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((cell) => cell.length)) rows.push(row);
  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""])));
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

async function readCsvMaybe(file) {
  try {
    return parseCsv(await readFile(file, "utf8"));
  } catch {
    return [];
  }
}

function classifyReply(row) {
  const text = `${row.summary || ""} ${row.notes || ""} ${row.objection || ""}`.toLowerCase();
  if (/price|expensive|budget|cost|\$/.test(text)) return "pricing";
  if (/too broad|niche|specific|channel|audience/.test(text)) return "niche_focus";
  if (/sample|example|quality|proof|demo/.test(text)) return "proof_quality";
  if (/weekly|subscription|month|recurring/.test(text)) return "subscription_fit";
  if (/not interested|not fit|irrelevant/.test(text)) return "not_fit";
  if (/paid|bought|invoice|order/.test(text)) return "conversion";
  return "unclassified";
}

function makeLearningRows({ replies, pipelineRows, revenue }) {
  if (replies.length) {
    const categories = [...new Set(replies.map(classifyReply))];
    return categories.map((category) => {
      const count = replies.filter((reply) => classifyReply(reply) === category).length;
      return {
        category,
        evidence_count: count,
        learning: `Observed ${count} reply item(s) about ${category}.`,
        next_test: category === "pricing"
          ? "Offer the USD 9 script pack first, then ask whether weekly delivery is worth USD 19/month."
          : category === "niche_focus"
            ? "Ask for one narrow channel lane before generating the custom proof pack."
            : category === "proof_quality"
              ? "Send the free sample and ask which proof asset felt easiest to record."
              : category === "subscription_fit"
                ? "Show the four-week subscription calendar before asking for monthly commitment."
                : category === "conversion"
                  ? "Run fulfillment only after external payment confirmation."
                  : "Ask one concrete feedback question before pitching again.",
        product_change: category === "pricing"
          ? "Keep low-friction USD 9 entry visible."
          : category === "niche_focus"
            ? "Emphasize custom-proof-pack.md in custom SKU copy."
            : category === "subscription_fit"
              ? "Make weekly delivery dates explicit in sales copy."
              : "No product change until more replies arrive."
      };
    });
  }
  return [
    {
      category: "no_replies_yet",
      evidence_count: 0,
      learning: "No private reply rows are available yet; the next learning source is manual outreach review.",
      next_test: "Review 5 CRM rows today and ask one feedback question in every manually sent message.",
      product_change: "Keep current product ladder unchanged until real replies arrive."
    },
    {
      category: "assumption_to_validate",
      evidence_count: pipelineRows.length,
      learning: `Current pipeline has ${pipelineRows.length} rows; fit is inferred from public signals, not buyer replies.`,
      next_test: "Track whether prospects prefer USD 9 one-off, USD 19 weekly, or USD 49 custom after reviewing the free sample.",
      product_change: "Use revenue model as planning only; do not optimize pricing until reply evidence exists."
    },
    {
      category: "revenue_model_gap",
      evidence_count: revenue.scenarios?.length || 0,
      learning: "Revenue scenarios exist, but conversion assumptions still need reply evidence.",
      next_test: "After 10 manually reviewed prospects, update replies.csv with objection and stage summaries.",
      product_change: "Add objections to content-sales-sequence only after they recur."
    }
  ];
}

function questionRows(learningRows) {
  const base = [
    {
      question: "Which proof asset would you actually record this week?",
      use_when: "after sending the free sample",
      maps_to: "proof_quality"
    },
    {
      question: "Would a weekly delivery calendar be useful, or do you only need one script at a time?",
      use_when: "when a prospect likes the sample but hesitates on subscription",
      maps_to: "subscription_fit"
    },
    {
      question: "What is the narrowest niche you would want this customized for?",
      use_when: "when a prospect asks for relevance",
      maps_to: "niche_focus"
    },
    {
      question: "Would USD 9 be a reasonable paid test for one proof-first script?",
      use_when: "when price sensitivity is unclear",
      maps_to: "pricing"
    }
  ];
  const categories = new Set(learningRows.map((row) => row.category));
  return base.map((row) => ({ ...row, priority: categories.has(row.maps_to) ? "high" : "normal" }));
}

function markdown({ replies, pipelineRows, learningRows, questions, revenue }) {
  const base = revenue.scenarios?.find((scenario) => scenario.scenario === "base");
  return `# TrendFoundry Content Feedback Loop

Generated: ${new Date().toISOString()}

This is the learning loop for first-customer sales. It reads local CRM outputs and optional ignored reply summaries, then turns them into product hypotheses and next feedback questions. It does not expose private replies in public docs.

## Current Evidence

- Private reply rows: ${replies.length}
- CRM pipeline rows: ${pipelineRows.length}
- Revenue model scenarios: ${revenue.scenarios?.length || 0}
- Base scenario new MRR: USD ${base?.new_mrr_usd ?? "unknown"}
- Base scenario month-one cash: USD ${base?.month_one_cash_usd ?? "unknown"}

## Learnings

| Category | Evidence | Learning | Next test | Product change |
| --- | --- | --- | --- | --- |
${learningRows.map((row) => `| ${row.category} | ${row.evidence_count} | ${row.learning.replace(/\|/g, "/")} | ${row.next_test.replace(/\|/g, "/")} | ${row.product_change.replace(/\|/g, "/")} |`).join("\n")}

## Feedback Questions

| Priority | Question | Use when | Maps to |
| --- | --- | --- | --- |
${questions.map((row) => `| ${row.priority} | ${row.question} | ${row.use_when} | ${row.maps_to} |`).join("\n")}

## Private Reply Input

Use \`data/content-sales-crm/replies.csv\` with columns:

\`\`\`csv
source,creator,summary,objection,stage,notes
youtube,Example Creator,Asked for narrower niche,too broad,replied_needs_response,Send custom pack outline
\`\`\`

## Safety Boundary

- Local learning only.
- No automatic sending or posting.
- No payment collection.
- No sensitive payment or account data request.
- No promise of views, subscribers, revenue, platform growth, or buyer outcomes.
`;
}

const pipelineRows = await readCsvMaybe(path.join(root, "dist", "content-sales-crm", "pipeline.csv"));
const replies = await readCsvMaybe(path.join(privateDir, "replies.csv"));
const revenue = await readJson("dist/content-revenue-model/manifest.json");
const learningRows = makeLearningRows({ replies, pipelineRows, revenue });
const questions = questionRows(learningRows);
const manifest = {
  generatedAt: new Date().toISOString(),
  privateReplyRows: replies.length,
  pipelineRows: pipelineRows.length,
  learningCount: learningRows.length,
  questionCount: questions.length,
  categories: learningRows.map((row) => row.category),
  safety: {
    sendsMessages: false,
    postsContent: false,
    collectsPayment: false,
    exposesPrivateReplies: false,
    requestsSensitiveData: false,
    noRevenuePromise: true,
    noViewPromise: true
  }
};

await mkdir(docsDir, { recursive: true });
await mkdir(outDir, { recursive: true });
await writeFile(path.join(docsDir, "content-feedback-loop.md"), markdown({ replies, pipelineRows, learningRows, questions, revenue }), "utf8");
await writeFile(path.join(outDir, "learnings.csv"), toCsv(learningRows, ["category", "evidence_count", "learning", "next_test", "product_change"]), "utf8");
await writeFile(path.join(outDir, "questions.csv"), toCsv(questions, ["priority", "question", "use_when", "maps_to"]), "utf8");
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

console.log(`Wrote ${path.join(docsDir, "content-feedback-loop.md")}`);
console.log(`Feedback learnings: ${learningRows.length}`);
