import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dataDir = path.join(root, "data");
const rawDir = path.join(dataDir, "raw");
const userAgent = "trendfoundry/0.1 (+local autonomous research product)";
const bilibiliDelayMs = Number(process.env.BILIBILI_DELAY_MS || 1800);
const bilibiliMaxAttempts = Number(process.env.BILIBILI_MAX_ATTEMPTS || 3);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "accept": "application/json",
      "user-agent": userAgent
    }
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }
  return response.json();
}

async function fetchBilibiliJson(url) {
  let lastError;
  for (let attempt = 1; attempt <= bilibiliMaxAttempts; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        "accept": "application/json",
        "accept-language": "zh-CN,zh;q=0.9,en;q=0.7",
        "referer": "https://www.bilibili.com/",
        "user-agent": userAgent
      }
    });
    if (response.ok) {
      return { json: await response.json(), attempts: attempt };
    }
    const retryable = response.status === 412 || response.status === 429 || response.status >= 500;
    lastError = new Error(`${response.status} ${response.statusText} after attempt ${attempt}: ${url}`);
    if (!retryable || attempt === bilibiliMaxAttempts) {
      throw lastError;
    }
    await sleep(bilibiliDelayMs * attempt + Math.floor(Math.random() * 500));
  }
  throw lastError;
}

function compactText(value, max = 260) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&quot;/g, "\"")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function stripCachedFallbackNote(value) {
  return String(value || "")
    .replace(/(?:\s*\(cached fallback because fresh collection failed\))+$/g, "")
    .trim();
}

function daysAgo(dateString) {
  const then = new Date(dateString).getTime();
  if (!Number.isFinite(then)) return 999;
  return Math.max(0, (Date.now() - then) / 86400000);
}

function parseRelativePublishedDate(text) {
  const normalized = String(text || "").toLowerCase();
  const match = normalized.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/);
  if (!match) return undefined;
  const amount = Number(match[1]);
  const unit = match[2];
  const days =
    unit === "second" || unit === "minute" || unit === "hour"
      ? 0
      : unit === "day"
        ? amount
        : unit === "week"
          ? amount * 7
          : unit === "month"
            ? amount * 30
            : amount * 365;
  return new Date(Date.now() - days * 86400000).toISOString();
}

function qualityFlagsFor(item) {
  const text = `${item.title || ""} ${item.summary || ""}`.toLowerCase();
  const checks = [
    ["engagement-bait", /三连|评论区|留言\s*666|666|自取|领取/],
    ["overclaim", /全网最|最全最细|吊打付费|少走\s*99%|99%的弯路|最强|天花板/],
    ["template-hype", /保姆级|零基础小白|一键复刻|爆款|无废话/],
    ["rights-risk", /去水印|无水印|告别水印|无印|一键解析|视频解析/],
    ["too-broad", /任何产品|全套教程|从0到1|从0基础/]
  ];
  return checks.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
}

function scoreItem(item) {
  const recency = Math.max(0, 45 - daysAgo(item.updatedAt || item.publishedAt || item.createdAt));
  const stars = Math.log10((item.stars || item.points || 0) + 1) * 12;
  const comments = Math.log10((item.comments || 0) + 1) * 10;
  const sourceWeight =
    item.source === "github"
      ? 12
      : item.source === "hn"
        ? 16
        : item.source === "bilibili" || item.source === "youtube"
          ? 18
          : 14;
  const creatorFit = /video|creator|youtube|bilibili|b站|agent|workflow|工作流|教程|remotion|script|voice|tts|thumbnail|short|视频/i.test(
    `${item.title} ${item.summary}`
  )
    ? 24
    : 0;
  const qualityFlags = qualityFlagsFor(item);
  const qualityPenalty = Math.min(48, qualityFlags.length * 14 + (item.source === "bilibili" && qualityFlags.length ? 8 : 0));
  const stalePenalty = item.stale ? -28 : 0;
  return Math.max(0, Math.round(recency + stars + comments + sourceWeight + creatorFit - qualityPenalty + stalePenalty));
}

function ideaAngles(item) {
  const title = item.title.replace(/[|#]/g, "").trim();
  return [
    `为什么 ${title} 现在值得创作者关注`,
    `${title} 背后的工作流能不能帮你省 10 小时`,
    `把 ${title} 做成一期 B 站/YouTube 视频的三种切入`,
    `${title}: 热度、坑点、可复现演示`
  ];
}

function whyNow(item) {
  const source = item.source === "hn" ? "discussion" : item.source === "arxiv" ? "research" : "trend";
  return `${item.title} is appearing in a current ${source} signal for ${item.sourceQuery}, which makes it a timely candidate for a practical creator test.`;
}

function demoSteps(item) {
  return [
    `Open and verify the source: ${item.url}`,
    "Reproduce the smallest useful workflow or summarize the core claim with evidence.",
    "Compare the before/after creator workflow: research time, production time, or output quality.",
    "State exactly who should use it and who should skip it."
  ];
}

function limitation(item) {
  if (item.stale) {
    return "This item comes from cached fallback data, so verify freshness before using it as a headline trend.";
  }
  const qualityFlags = qualityFlagsFor(item);
  if (qualityFlags.length) {
    return `Quality-risk signals detected (${qualityFlags.join(", ")}). Treat this as market demand evidence, not as a script template; rewrite the angle with proof and a narrower claim.`;
  }
  if (item.source === "youtube" || item.source === "bilibili") {
    return "Platform popularity is not proof of quality; validate the workflow before recommending it.";
  }
  if (item.source === "github") {
    return "Stars and recent activity can overstate production readiness; test install friction and maintenance quality.";
  }
  if (item.source === "arxiv") {
    return "Research papers may be too early for mainstream creators; translate into a practical demo or skip.";
  }
  return "Treat this as a signal, not a guarantee of views, revenue, or technical maturity.";
}

function packageItem(item) {
  const score = scoreItem(item);
  const qualityFlags = qualityFlagsFor(item);
  const fit = item.stale
    ? score >= 80
      ? "medium"
      : "watch"
    : score >= 95
      ? "high"
      : score >= 70
        ? "medium"
        : "watch";
  return {
    ...item,
    score,
    stale: Boolean(item.stale),
    qualityFlags,
    qualityRisk: qualityFlags.length ? "review" : "normal",
    monetizationFit: fit,
    targetCreator: /developer|github|repo|agent|framework/i.test(`${item.title} ${item.summary}`)
      ? "tech explainer / developer educator"
      : "AI workflow creator",
    deliverables: {
      bilibiliTitles: ideaAngles(item).map((angle) => `【实测】${angle}`),
      youtubeTitles: ideaAngles(item).map((angle) => `${angle} (practical test)`),
      hook: `这期不追热点，直接复现 ${item.title} 的可用步骤、限制和创作价值。`,
      whyNow: whyNow(item),
      demoSteps: demoSteps(item),
      outline: [
        "30 秒问题开场: 观众为什么现在会关心它",
        "3 分钟最小可复现实测: 安装、输入、输出",
        "2 分钟对比: 它替代了哪一步，不能替代哪一步",
        "1 分钟变现角度: 内容、模板、咨询或工具包",
        "结尾: 给观众一个可复制的小任务"
      ],
      thumbnailPrompt: `A clean tech explainer thumbnail about ${item.title}, showing a creator desk, GitHub-style trend graph, bold Chinese title area, high contrast, no fake logos`,
      limitation: limitation(item)
    }
  };
}

async function collectGithub(topics) {
  const items = [];
  for (const topic of topics) {
    const url = `https://api.github.com/search/repositories?q=topic:${encodeURIComponent(
      topic
    )}+pushed:>=2026-01-01&sort=stars&order=desc&per_page=8`;
    try {
      const json = await fetchJson(url);
      items.push(
        ...json.items.map((repo) => ({
          source: "github",
          sourceQuery: topic,
          id: repo.full_name,
          title: repo.full_name,
          summary: compactText(repo.description),
          url: repo.html_url,
          stars: repo.stargazers_count,
          comments: repo.open_issues_count,
          language: repo.language,
          updatedAt: repo.pushed_at,
          createdAt: repo.created_at
        }))
      );
    } catch (error) {
      items.push({
        source: "github",
        sourceQuery: topic,
        id: `github-error-${topic}`,
        title: `GitHub collection failed for ${topic}`,
        summary: error.message,
        url,
        updatedAt: new Date().toISOString()
      });
    }
  }
  return items;
}

async function collectHn(queries) {
  const items = [];
  for (const query of queries) {
    const url = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=6`;
    try {
      const json = await fetchJson(url);
      items.push(
        ...json.hits.map((hit) => ({
          source: "hn",
          sourceQuery: query,
          id: hit.objectID,
          title: hit.title || hit.story_title || query,
          summary: compactText(hit._highlightResult?.title?.value || hit.title),
          url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
          points: hit.points || 0,
          comments: hit.num_comments || 0,
          createdAt: hit.created_at,
          updatedAt: hit.created_at
        }))
      );
    } catch (error) {
      items.push({
        source: "hn",
        sourceQuery: query,
        id: `hn-error-${query}`,
        title: `HN collection failed for ${query}`,
        summary: error.message,
        url,
        updatedAt: new Date().toISOString()
      });
    }
  }
  return items;
}

async function collectArxiv(queries) {
  const items = [];
  for (const query of queries) {
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=5&sortBy=submittedDate&sortOrder=descending`;
    try {
      const response = await fetch(url, { headers: { "user-agent": userAgent } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const xml = await response.text();
      const entries = xml.split("<entry>").slice(1);
      for (const entry of entries) {
        const title = compactText(entry.match(/<title>([\s\S]*?)<\/title>/)?.[1], 160);
        const summary = compactText(entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1], 360);
        const urlMatch = entry.match(/<id>([\s\S]*?)<\/id>/);
        const published = entry.match(/<published>([\s\S]*?)<\/published>/)?.[1];
        items.push({
          source: "arxiv",
          sourceQuery: query,
          id: urlMatch?.[1] || `${query}-${title}`,
          title,
          summary,
          url: urlMatch?.[1] || url,
          updatedAt: published,
          publishedAt: published
        });
      }
    } catch (error) {
      items.push({
        source: "arxiv",
        sourceQuery: query,
        id: `arxiv-error-${query}`,
        title: `arXiv collection failed for ${query}`,
        summary: error.message,
        url,
        updatedAt: new Date().toISOString()
      });
    }
  }
  return items;
}

async function collectBilibili(queries) {
  const items = [];
  for (const [index, query] of queries.entries()) {
    const url = `https://api.bilibili.com/x/web-interface/search/type?search_type=video&order=pubdate&page=1&keyword=${encodeURIComponent(query)}`;
    try {
      if (index > 0) {
        await sleep(bilibiliDelayMs);
      }
      const { json, attempts } = await fetchBilibiliJson(url);
      const results = json?.data?.result || [];
      items.push(
        ...results.slice(0, 6).map((video) => ({
          source: "bilibili",
          sourceQuery: query,
          id: video.bvid || String(video.aid),
          title: compactText(video.title, 160),
          summary: compactText(video.description || `${video.author || "Unknown"} / ${video.typename || "video"}`, 260),
          url: video.arcurl || `https://www.bilibili.com/video/${video.bvid}`,
          points: Number(video.play) || 0,
          comments: Number(video.review) || 0,
          author: video.author,
          collectionAttempts: attempts,
          createdAt: video.pubdate ? new Date(video.pubdate * 1000).toISOString() : new Date().toISOString(),
          updatedAt: video.pubdate ? new Date(video.pubdate * 1000).toISOString() : new Date().toISOString()
        }))
      );
    } catch (error) {
      items.push({
        source: "bilibili",
        sourceQuery: query,
        id: `bilibili-error-${query}`,
        title: `Bilibili collection failed for ${query}`,
        summary: error.message,
        url,
        updatedAt: new Date().toISOString()
      });
    }
  }
  return items;
}

function extractYoutubeRendererObjects(html) {
  const objects = [];
  const marker = "\"videoRenderer\":";
  let cursor = 0;
  while (objects.length < 10) {
    const start = html.indexOf(marker, cursor);
    if (start === -1) break;
    let objectStart = start + marker.length;
    while (html[objectStart] && /\s/.test(html[objectStart])) objectStart += 1;
    if (html[objectStart] !== "{") {
      cursor = objectStart + 1;
      continue;
    }
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = objectStart; i < html.length; i += 1) {
      const char = html[i];
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = !inString;
      } else if (!inString && char === "{") {
        depth += 1;
      } else if (!inString && char === "}") {
        depth -= 1;
        if (depth === 0) {
          objects.push(html.slice(objectStart, i + 1));
          cursor = i + 1;
          break;
        }
      }
    }
    if (cursor <= objectStart) break;
  }
  return objects;
}

async function collectYoutube(queries) {
  const items = [];
  for (const query of queries) {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=CAI%253D`;
    try {
      const response = await fetch(url, {
        headers: {
          "accept": "text/html",
          "accept-language": "en-US,en;q=0.8",
          "user-agent": userAgent
        }
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const html = await response.text();
      const renderers = extractYoutubeRendererObjects(html);
      for (const raw of renderers.slice(0, 6)) {
        try {
          const video = JSON.parse(raw);
          const videoId = video.videoId;
          const title = video.title?.runs?.map((run) => run.text).join("") || video.title?.simpleText;
          if (!videoId || !title) continue;
          const publishedText = video.publishedTimeText?.simpleText;
          const estimatedPublished = parseRelativePublishedDate(publishedText);
          const summary = [
            video.ownerText?.runs?.map((run) => run.text).join(""),
            publishedText,
            video.viewCountText?.simpleText
          ]
            .filter(Boolean)
            .join(" / ");
          items.push({
            source: "youtube",
            sourceQuery: query,
            id: videoId,
            title: compactText(title, 160),
            summary: compactText(summary || query, 260),
            url: `https://www.youtube.com/watch?v=${videoId}`,
            points: Number(String(video.viewCountText?.simpleText || "").replace(/\D/g, "")) || 0,
            comments: 0,
            createdAt: estimatedPublished,
            updatedAt: estimatedPublished
          });
        } catch {
          // Keep parsing the remaining renderer objects.
        }
      }
      if (!items.some((item) => item.source === "youtube" && item.sourceQuery === query)) {
        throw new Error("No parsable videoRenderer entries");
      }
    } catch (error) {
      items.push({
        source: "youtube",
        sourceQuery: query,
        id: `youtube-error-${query}`,
        title: `YouTube collection failed for ${query}`,
        summary: error.message,
        url,
        updatedAt: new Date().toISOString()
      });
    }
  }
  return items;
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.url || item.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isErrorItem(item) {
  return String(item.id || "").includes("-error-") || /collection failed/i.test(item.title || "");
}

async function loadFallbackItems() {
  const snapshots = [];
  try {
    snapshots.push(JSON.parse(await readFile(path.join(dataDir, "latest.json"), "utf8")));
  } catch {
    // No previous latest snapshot yet.
  }
  try {
    const files = (await readdir(rawDir))
      .filter((name) => /^snapshot-\d+\.json$/.test(name))
      .sort()
      .reverse()
      .slice(0, 8);
    for (const file of files) {
      try {
        snapshots.push(JSON.parse(await readFile(path.join(rawDir, file), "utf8")));
      } catch {
        // Ignore malformed historical cache files.
      }
    }
  } catch {
    // Raw cache directory may not exist on first run.
  }
  return snapshots.flatMap((snapshot) => snapshot.items || []).filter((item) => !isErrorItem(item));
}

function cachedFallbacksFor(errors, fallbackItems) {
  const fallbackKeys = new Set();
  const fallbacks = [];
  for (const error of errors) {
    const matches = fallbackItems
      .filter((item) => item.source === error.source && item.sourceQuery === error.sourceQuery)
      .slice(0, 6);
    for (const item of matches) {
      const key = item.url || item.id;
      if (fallbackKeys.has(key)) continue;
      fallbackKeys.add(key);
      fallbacks.push({
        ...item,
        stale: true,
        summary: compactText(`${stripCachedFallbackNote(item.summary)} (cached fallback because fresh collection failed)`, 300)
      });
    }
  }
  return fallbacks;
}

async function main() {
  await mkdir(rawDir, { recursive: true });
  const seed = JSON.parse(await readFile(path.join(dataDir, "seed_sources.json"), "utf8"));
  const fallbackItems = await loadFallbackItems();
  const [github, hn, arxiv, bilibili, youtube] = await Promise.all([
    collectGithub(seed.githubTopics),
    collectHn(seed.hnQueries),
    collectArxiv(seed.arxivQueries),
    collectBilibili(seed.bilibiliQueries || []),
    collectYoutube(seed.youtubeQueries || [])
  ]);
  const rawItems = [...github, ...hn, ...arxiv, ...bilibili, ...youtube];
  const errors = rawItems.filter(isErrorItem).map((item) => ({
    source: item.source,
    sourceQuery: item.sourceQuery,
    title: item.title,
    summary: item.summary,
    url: item.url,
    generatedAt: new Date().toISOString()
  }));
  const collected = dedupe([...rawItems.filter((item) => !isErrorItem(item)), ...cachedFallbacksFor(errors, fallbackItems)])
    .map(packageItem)
    .sort((a, b) => b.score - a.score);
  const snapshot = {
    generatedAt: new Date().toISOString(),
    product: "TrendFoundry Creator Intelligence",
    totalItems: collected.length,
    errorCount: errors.length,
    errors,
    items: collected
  };
  await writeFile(path.join(rawDir, `snapshot-${Date.now()}.json`), JSON.stringify(snapshot, null, 2), "utf8");
  await writeFile(path.join(dataDir, "latest.json"), JSON.stringify(snapshot, null, 2), "utf8");
  console.log(`Collected ${snapshot.totalItems} items. Top: ${snapshot.items[0]?.title || "none"}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
