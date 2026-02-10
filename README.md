# GitHub Trending Tracker

一个用于追踪 GitHub 热门项目的 Agent Skill，支持每日/每周/每月三个维度的趋势抓取、对比和中文报告生成。

## 功能特性

- 抓取 GitHub Trending 页面的热门仓库数据
- 支持**每日**、**每周**、**每月**三个时间维度
- 自动与历史数据对比，检测排名变化
- 英文简介自动翻译为中文
- 生成结构化中文 Markdown 报告

## 报告示例

| 排名 | 变化 | 仓库 | Stars | 语言 | 简介 |
|------|------|------|-------|------|------|
| 1 | 🆕 新上榜 | user/repo | 12,345 | Python | 一个很棒的项目 |
| 2 | 🔼 上升3 | user/repo2 | 8,000 | Rust | 高性能工具 |
| 3 | 🔽 下降1 | user/repo3 | 6,500 | Go | 云原生框架 |

报告包含以下板块：
- **排行榜** — 热门仓库排名表
- **🆕 新上榜** — 本次新出现的项目
- **📉 掉出榜单** — 上次在榜、本次消失的项目
- **🚀 上升最快** — 排名跃升最大的项目

## 安装

```bash
npx skills add chenyuguang/github-trending-tracker@github-trending-tracker -g -y
```

## 使用方法

### 方式一：作为 Claude Code Skill

安装后，在 Claude Code 中直接说：

- "帮我看看 GitHub 今日热门项目"
- "生成 GitHub 趋势报告"
- "GitHub trending report"

### 方式二：独立运行脚本

```bash
# 抓取数据
node scripts/fetch-trending.js

# 生成报告
node scripts/generate-report.js

# 指定日期生成报告
node scripts/generate-report.js 2026-02-10
```

## 文件结构

```
github-trending-tracker/
├── SKILL.md                    # Skill 元数据和说明
├── README.md                   # 本文件
├── scripts/
│   ├── fetch-trending.js       # 数据抓取脚本
│   └── generate-report.js      # 中文报告生成脚本（含翻译）
└── references/
    └── report-format.md        # 报告格式参考
```

## 数据存储

- 原始数据：`~/.claude/github-trending/data/`
- 报告文件：`~/.claude/github-trending/reports/`

## 依赖

- Node.js >= 14
- 无需额外 npm 依赖（纯 Node.js 标准库）

## 作者

**上霜青菜**

## 许可证

MIT
