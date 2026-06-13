import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "content-outreach-routes");

function compact(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim() || fallback;
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

async function readTextMaybe(relativePath) {
  try {
    return await readFile(path.join(root, relativePath), "utf8");
  } catch {
    return "";
  }
}

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function extractProofUrl(packText) {
  return packText.match(/^- Proof URL:\s*(\S+)/m)?.[1] || "";
}

function appendRoute(routes, route) {
  if (!route.url || routes.some((item) => item.url === route.url)) return;
  routes.push(route);
}

async function fetchJson(url, timeoutMs = 7000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "TrendFoundry local contact-route audit"
      }
    });
    if (!response.ok) return { ok: false, status: response.status, data: null };
    return { ok: true, status: response.status, data: await response.json() };
  } catch (error) {
    return { ok: false, status: 0, error: error.name || error.message, data: null };
  } finally {
    clearTimeout(timeout);
  }
}

async function discoverYoutubeRoutes(row, proofUrl) {
  const routes = [];
  const oembed = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(proofUrl)}`;
  const result = await fetchJson(oembed);
  if (result.ok && result.data?.author_url) {
    const channel = String(result.data.author_url).replace(/\/+$/g, "");
    appendRoute(routes, {
      type: "youtube_channel",
      url: channel,
      confidence: "high",
      source: "youtube_oembed_author_url"
    });
    appendRoute(routes, {
      type: "youtube_about",
      url: `${channel}/about`,
      confidence: "medium",
      source: "derived_from_oembed_author_url"
    });
  }
  appendRoute(routes, {
    type: "youtube_reference_video",
    url: proofUrl,
    confidence: "low",
    source: "send_pack_proof_url"
  });
  return { routes, lookupStatus: result.ok ? "oembed_ok" : `oembed_failed_${result.status || result.error || "unknown"}` };
}

function discoverBilibiliRoutes(row, proofUrl) {
  const routes = [];
  appendRoute(routes, {
    type: "bilibili_reference_video",
    url: proofUrl,
    confidence: "low",
    source: "send_pack_proof_url"
  });
  appendRoute(routes, {
    type: "bilibili_creator_search",
    url: `https://search.bilibili.com/upuser?keyword=${encodeURIComponent(row.creator || "")}`,
    confidence: "low",
    source: "creator_name_search"
  });
  return { routes, lookupStatus: "derived_without_login" };
}

function privateMarkdown({ generatedAt, rows }) {
  const lines = [
    "# TrendFoundry Content Outreach Routes",
    "",
    `Generated: ${generatedAt}`,
    "",
    "Private local route candidates. Do not send messages from this file. Do not treat route candidates as verified permission.",
    "",
    "| Review ID | Creator | Source | Route status | Candidates | Next check |",
    "| --- | --- | --- | --- | --- | --- |"
  ];
  for (const row of rows) {
    const links = row.routes.map((route) => `${route.type}: ${route.url}`).join("<br>");
    lines.push(`| ${row.review_id} | ${row.creator.replace(/\|/g, "/")} | ${row.source} | ${row.route_status} | ${links || "none"} | ${row.next_check} |`);
  }
  lines.push("");
  lines.push("## Verification Checklist");
  lines.push("");
  lines.push("1. Open the highest-confidence route candidate.");
  lines.push("2. Confirm the route belongs to the same creator/channel as the proof URL.");
  lines.push("3. Look only for a public business inquiry email, official website contact page, or platform-native contact button.");
  lines.push("4. Do not infer, enrich, or guess an address from a name or domain.");
  lines.push("5. If a verified recipient exists, add it manually to the matching `.eml` draft; otherwise keep the campaign unsent.");
  lines.push("");
  lines.push("## Safety");
  lines.push("");
  lines.push("- Does not send messages.");
  lines.push("- Does not log in to creator platforms.");
  lines.push("- Does not collect private emails or phone numbers.");
  lines.push("- Does not guess private recipient addresses.");
  lines.push("- Does not upload files or collect payment.");
  return lines.join("\n");
}

function publicMarkdown(manifest) {
  return `# TrendFoundry Content Outreach Routes

Generated: ${manifest.generatedAt}

This public-safe summary counts local contact-route candidates for the next outbound batch. Detailed creator rows stay in ignored \`dist/content-outreach-routes/\`.

## Current Counts

- Source batch rows: ${manifest.sourceBatchRows}
- Rows with route candidates: ${manifest.rowsWithRoutes}
- Total route candidates: ${manifest.routeCandidateCount}
- High-confidence route candidates: ${manifest.highConfidenceRoutes}
- Messages sent: 0
- Private emails collected: 0
- Verified recipient addresses exposed here: 0

## Safety Boundary

- Does not send messages.
- Does not log in to creator platforms.
- Does not collect private emails or phone numbers.
- Does not guess private recipient addresses.
- Does not upload files or collect payment.
- Route candidates are not permission to contact; they only reduce manual research before human/safety review.
- Sending remains blocked until a verified public recipient or platform-native contact path is confirmed.
`;
}

const generatedAt = new Date().toISOString();
const sendBatchText = stripBom(await readTextMaybe("dist/content-send-batch/send-batch.csv"));
const sendRows = parseCsv(sendBatchText);
const rows = [];

for (const row of sendRows) {
  const packPath = compact(row.review_file);
  const packText = stripBom(await readTextMaybe(packPath));
  const proofUrl = extractProofUrl(packText);
  let discovery = { routes: [], lookupStatus: "missing_proof_url" };
  if (proofUrl && row.source === "youtube") {
    discovery = await discoverYoutubeRoutes(row, proofUrl);
  } else if (proofUrl && row.source === "bilibili") {
    discovery = discoverBilibiliRoutes(row, proofUrl);
  } else if (proofUrl) {
    discovery = {
      routes: [{ type: "reference_url", url: proofUrl, confidence: "low", source: "send_pack_proof_url" }],
      lookupStatus: "reference_only"
    };
  }
  rows.push({
    review_id: compact(row.review_id),
    campaign_id: compact(row.campaign_id),
    creator: compact(row.creator, "private prospect"),
    source: compact(row.source),
    proof_url: proofUrl,
    route_status: discovery.routes.length ? "routes_found" : "no_route_found",
    lookup_status: discovery.lookupStatus,
    route_count: discovery.routes.length,
    high_confidence_route_count: discovery.routes.filter((route) => route.confidence === "high").length,
    next_check: discovery.routes.some((route) => route.confidence === "high")
      ? "verify channel ownership, then inspect public about/contact surfaces"
      : "inspect reference URL and official profile surfaces; keep unsent if no public contact path exists",
    routes: discovery.routes
  });
}

const flatRows = rows.flatMap((row) => row.routes.map((route) => ({
  review_id: row.review_id,
  campaign_id: row.campaign_id,
  creator: row.creator,
  source: row.source,
  route_type: route.type,
  route_url: route.url,
  confidence: route.confidence,
  route_source: route.source,
  lookup_status: row.lookup_status,
  next_check: row.next_check
})));

const manifest = {
  generatedAt,
  sourceBatchRows: sendRows.length,
  rowsWithRoutes: rows.filter((row) => row.route_count > 0).length,
  routeCandidateCount: flatRows.length,
  highConfidenceRoutes: flatRows.filter((row) => row.confidence === "high").length,
  verifiedRecipientCount: 0,
  blockedUntilVerifiedRecipientCount: sendRows.length,
  safety: {
    sendsMessages: false,
    logsIn: false,
    collectsPrivateEmails: false,
    guessesPrivateRecipients: false,
    exposesVerifiedRecipientsInDocs: false,
    requiresVerifiedRecipientBeforeSend: true,
    uploadsFiles: false,
    collectsPayment: false
  }
};

await mkdir(outDir, { recursive: true });
await mkdir(docsDir, { recursive: true });
await writeFile(path.join(outDir, "routes.json"), JSON.stringify({ ...manifest, rows }, null, 2), "utf8");
await writeFile(path.join(outDir, "routes.csv"), toCsv(flatRows, ["review_id", "campaign_id", "creator", "source", "route_type", "route_url", "confidence", "route_source", "lookup_status", "next_check"]), "utf8");
await writeFile(path.join(outDir, "routes.md"), privateMarkdown({ generatedAt, rows }), "utf8");
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
await writeFile(path.join(docsDir, "content-outreach-routes.md"), publicMarkdown(manifest), "utf8");

console.log(`Wrote ${path.join(docsDir, "content-outreach-routes.md")}`);
console.log(`Route candidates: ${manifest.routeCandidateCount} across ${manifest.rowsWithRoutes}/${manifest.sourceBatchRows} batch rows`);
