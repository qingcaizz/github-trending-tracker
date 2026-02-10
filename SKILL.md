---
name: github-trending-tracker
description: Use when user wants to check GitHub trending projects, compare daily/weekly/monthly ranking changes, or generate trending reports. Triggers include "GitHub trending", "hot projects", "trending report", "trending changes", "热门项目", "趋势报告".
---

# GitHub 热门项目追踪器

抓取、汇总并对比 GitHub Trending 仓库，覆盖每日、每周、每月三个时间维度，检测排名变化并生成结构化报告。

## 使用场景

- 用户询问 GitHub 热门/流行/趋势项目
- 用户需要每日/每周/每月的趋势对比
- 用户想追踪排名变化
- 关键词："trending"、"热门项目"、"趋势报告"

## 核心流程

1. **抓取数据** — 运行 `scripts/fetch-trending.js`
2. **对比历史** — 与前一次数据对比，检测变化
3. **生成报告** — 运行 `scripts/generate-report.js`，输出中文 Markdown 报告
4. **展示摘要** — 向用户呈现排名变化

## 快速使用

```bash
# 抓取三个时间维度的数据（每日/每周/每月）
node <skill_path>/scripts/fetch-trending.js

# 生成对比报告
node <skill_path>/scripts/generate-report.js
```

数据目录：`~/.claude/github-trending/data/`
报告目录：`~/.claude/github-trending/reports/`

## 报告格式

每个时间维度包含：

| 排名 | 变化 | 仓库 | Stars | 语言 | 简介 |
|------|------|------|-------|------|------|
| 1 | 🆕 新上榜 | user/repo | 1.2k | Python | ... |
| 2 | 🔼 上升3 | user/repo2 | 800 | Rust | ... |
| 3 | 🔽 下降1 | user/repo3 | 650 | Go | ... |

## 报告关键板块

1. **排行榜** — 各时间维度的热门仓库排名
2. **🆕 新上榜** — 上次不在榜单、本次新出现的项目
3. **📉 掉出榜单** — 上次在榜、本次消失的项目
4. **🚀 上升最快** — 排名跃升最多的项目

## 参考

- `references/report-format.md` — 报告结构详细说明
- `scripts/fetch-trending.js` — 数据抓取脚本
- `scripts/generate-report.js` — 报告生成脚本（中文输出）
