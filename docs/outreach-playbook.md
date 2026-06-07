# TrendFoundry Outreach Playbook

## Target Segments

1. Small AI tool creators on Bilibili or YouTube who publish tutorials weekly.
2. Developer educators covering GitHub projects, coding agents, MCP, and automation.
3. Creator teams that already monetize through courses, paid communities, templates, or consulting.

## Qualification Signals

- Recent video published in the last 30 days.
- Content uses practical demos, not only news commentary.
- Channel has repeated AI/dev topics, meaning a weekly topic pipeline is valuable.
- Creator already sells something, asks viewers to join a group, or offers services.

## First Message

Hi, I built a small weekly brief that turns GitHub, YouTube, Bilibili, HN, and arXiv signals into recordable AI/dev video ideas.

One example from this week's sample:

Topic: {topic}
Source: {url}
Suggested title: {title}
Hook: {hook}

If this saves you topic research time, I can send 12 of these each week with source links, Bilibili/YouTube titles, outlines, and thumbnail prompts.

## Chinese First Message

你好，我做了一个每周 AI/开发者创作者情报包，会把 GitHub、YouTube、B 站、HN、arXiv 的公开信号整理成能直接录的视频选题。

本周样品里有一个例子：

选题：{topic}
来源：{url}
标题建议：{title}
开场 hook：{hook}

如果这能帮你节省选题调研时间，我可以每周发 12 个类似选题，包含来源链接、B 站/YouTube 标题、视频结构和缩略图提示词。

## Follow-Up

Quick follow-up. I am not selling generic AI news. The brief is meant to be a production input: proof link, title, hook, outline, and limitation angle for each topic.

I can send the current sample pack if you want to judge whether it fits your channel.

## Fulfillment SOP

1. Run `npm run daily`.
2. Review `docs/daily-brief.md` for failed-source health and obvious low-quality topics.
3. Run `npm run export`.
4. Open `dist/trendfoundry-sample-pack/outreach-board.md` and choose the first 20 prospects.
5. Send `dist/trendfoundry-sample-pack/daily-brief.md` and `ready-to-record-script.md` as the free sample.
6. For paid delivery, attach `opportunities.csv` and paste the top 12 ideas into the buyer's preferred format.

## Guardrails

- Do not promise guaranteed views or revenue.
- Do not claim private platform data access.
- Do not spam bulk messages; personalize with one topic from `prospects.csv`.
- Do not reuse a creator's likeness, private contact data, or paid content.
