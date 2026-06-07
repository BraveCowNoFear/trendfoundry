import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dataDir = path.join(root, "data");
const rawDir = path.join(dataDir, "raw");
const userAgent = "trendfoundry/0.1 (+local autonomous research product)";

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

function compactText(value, max = 260) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function daysAgo(dateString) {
  const then = new Date(dateString).getTime();
  if (!Number.isFinite(then)) return 999;
  return Math.max(0, (Date.now() - then) / 86400000);
}

function scoreItem(item) {
  const recency = Math.max(0, 45 - daysAgo(item.updatedAt || item.publishedAt || item.createdAt));
  const stars = Math.log10((item.stars || item.points || 0) + 1) * 12;
  const comments = Math.log10((item.comments || 0) + 1) * 10;
  const sourceWeight = item.source === "github" ? 12 : item.source === "hn" ? 16 : 14;
  const creatorFit = /video|creator|youtube|bilibili|agent|workflow|remotion|script|voice|tts|thumbnail|short/i.test(
    `${item.title} ${item.summary}`
  )
    ? 24
    : 0;
  return Math.round(recency + stars + comments + sourceWeight + creatorFit);
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

function packageItem(item) {
  const score = scoreItem(item);
  return {
    ...item,
    score,
    monetizationFit:
      score >= 80
        ? "high"
        : score >= 60
          ? "medium"
          : "watch",
    targetCreator: /developer|github|repo|agent|framework/i.test(`${item.title} ${item.summary}`)
      ? "tech explainer / developer educator"
      : "AI workflow creator",
    deliverables: {
      bilibiliTitles: ideaAngles(item).map((angle) => `【实测】${angle}`),
      youtubeTitles: ideaAngles(item).map((angle) => `${angle} (practical test)`),
      hook: `这期不讲概念，直接验证 ${item.title} 是否能进入真实创作工作流。`,
      outline: [
        "30 秒问题开场: 观众为什么现在会关心它",
        "3 分钟最小可复现实测: 安装、输入、输出",
        "2 分钟对比: 它替代了哪一步，不能替代哪一步",
        "1 分钟变现角度: 内容、模板、咨询或工具包",
        "结尾: 给观众一个可复制的小任务"
      ],
      thumbnailPrompt: `A clean tech explainer thumbnail about ${item.title}, showing a creator desk, GitHub-style trend graph, bold Chinese title area, high contrast, no fake logos`
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

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.url || item.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function main() {
  await mkdir(rawDir, { recursive: true });
  const seed = JSON.parse(await readFile(path.join(dataDir, "seed_sources.json"), "utf8"));
  const [github, hn, arxiv] = await Promise.all([
    collectGithub(seed.githubTopics),
    collectHn(seed.hnQueries),
    collectArxiv(seed.arxivQueries)
  ]);
  const collected = dedupe([...github, ...hn, ...arxiv]).map(packageItem).sort((a, b) => b.score - a.score);
  const snapshot = {
    generatedAt: new Date().toISOString(),
    product: "TrendFoundry Creator Intelligence",
    totalItems: collected.length,
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
