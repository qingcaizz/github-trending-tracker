#!/usr/bin/env node

/**
 * GitHub Trending 报告生成器
 * 对比当前与历史趋势数据，生成中文 Markdown 报告
 * 自动将英文简介翻译为中文
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const https = require("https");

const DATA_DIR = path.join(os.homedir(), ".claude", "github-trending", "data");
const REPORT_DIR = path.join(
  os.homedir(),
  ".claude",
  "github-trending",
  "reports"
);
const TIMEFRAMES = ["daily", "weekly", "monthly"];
const TF_LABELS = { daily: "每日热门", weekly: "每周热门", monthly: "每月热门" };

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// --- 翻译相关 ---

function isChinese(text) {
  return /[\u4e00-\u9fff]/.test(text) && !/[a-zA-Z]{4,}/.test(text);
}

function translateText(text, sl = "en", tl = "zh-CN") {
  if (!text || isChinese(text)) return Promise.resolve(text);

  const encoded = encodeURIComponent(text);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encoded}`;

  return new Promise((resolve) => {
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            const translated = json[0].map((s) => s[0]).join("");
            resolve(translated);
          } catch {
            resolve(text);
          }
        });
      })
      .on("error", () => resolve(text));
  });
}

async function translateBatch(texts) {
  const results = [];
  // 逐条翻译，间隔 200ms 避免限流
  for (const text of texts) {
    results.push(await translateText(text));
    await new Promise((r) => setTimeout(r, 200));
  }
  return results;
}

async function translateRepos(repos) {
  if (!repos.length) return repos;

  const descriptions = repos.map((r) => r.description || "");
  console.log(`    正在翻译 ${descriptions.filter((d) => d && !isChinese(d)).length} 条简介...`);
  const translated = await translateBatch(descriptions);

  return repos.map((r, i) => ({
    ...r,
    descriptionZh: translated[i] || r.description || "",
  }));
}

// --- 数据加载 ---

function loadData(timeframe, date) {
  const filepath = path.join(DATA_DIR, `${timeframe}-${date}.json`);
  if (!fs.existsSync(filepath)) return null;
  return JSON.parse(fs.readFileSync(filepath, "utf8"));
}

function findPreviousDate(timeframe, currentDate) {
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.startsWith(`${timeframe}-`) && f.endsWith(".json"))
    .sort()
    .reverse();

  for (const file of files) {
    const dateMatch = file.match(/\d{4}-\d{2}-\d{2}/);
    if (dateMatch && dateMatch[0] < currentDate) {
      return dateMatch[0];
    }
  }
  return null;
}

function compareData(current, previous) {
  if (!current || !current.repos) return { repos: [], newEntries: [], dropped: [], rising: [] };

  const currentRepos = current.repos;
  const prevMap = new Map();

  if (previous && previous.repos) {
    previous.repos.forEach((r) => prevMap.set(r.name, r));
  }

  const repos = currentRepos.map((repo) => {
    const prev = prevMap.get(repo.name);
    let change = "NEW";
    if (prev) {
      const diff = prev.rank - repo.rank;
      if (diff > 0) change = `+${diff}`;
      else if (diff < 0) change = `${diff}`;
      else change = "=";
    }
    return { ...repo, change };
  });

  const currentNames = new Set(currentRepos.map((r) => r.name));
  const newEntries = repos.filter((r) => r.change === "NEW");
  const dropped = previous && previous.repos
    ? previous.repos.filter((r) => !currentNames.has(r.name))
    : [];
  const rising = repos
    .filter((r) => r.change !== "NEW" && r.change !== "=" && r.change.startsWith("+"))
    .sort((a, b) => parseInt(b.change) - parseInt(a.change))
    .slice(0, 5);

  return { repos, newEntries, dropped, rising };
}

// --- 报告格式化 ---

function formatChangeLabel(change) {
  if (change === "NEW") return "🆕 新上榜";
  if (change === "=") return "➖ 不变";
  if (change.startsWith("+")) return `🔼 上升${change.slice(1)}`;
  if (change.startsWith("-")) return `🔽 下降${change.slice(1).replace("-", "")}`;
  return change;
}

function formatTable(repos) {
  if (!repos.length) return "_暂无数据_\n";

  let table =
    "| 排名 | 变化 | 仓库 | Stars | 语言 | 简介 |\n";
  table +=
    "|------|------|------|-------|------|------|\n";

  for (const r of repos.slice(0, 25)) {
    const desc = (r.descriptionZh || r.description || "").slice(0, 60).replace(/\|/g, "/");
    const change = formatChangeLabel(r.change || "");
    table += `| ${r.rank} | ${change} | [${r.name}](https://github.com/${r.name}) | ${r.totalStars || r.starsGained || ""} | ${r.language || ""} | ${desc} |\n`;
  }
  return table;
}

async function generateReport(date) {
  ensureDir(REPORT_DIR);

  let report = `# GitHub 热门项目报告 - ${date}\n\n`;
  report += `生成时间：${new Date().toISOString()}\n\n`;

  for (const tf of TIMEFRAMES) {
    const current = loadData(tf, date);
    if (!current) {
      report += `## ${TF_LABELS[tf]}\n\n`;
      report += `_${date} 暂无数据_\n\n`;
      continue;
    }

    const prevDate = findPreviousDate(tf, date);
    const previous = prevDate ? loadData(tf, prevDate) : null;
    const comparison = compareData(current, previous);

    // 翻译简介
    console.log(`  [${TF_LABELS[tf]}] 共 ${comparison.repos.length} 个项目`);
    comparison.repos = await translateRepos(comparison.repos);
    comparison.newEntries = comparison.repos.filter((r) => r.change === "NEW");
    if (comparison.dropped.length > 0) {
      comparison.dropped = await translateRepos(comparison.dropped);
    }

    report += `## ${TF_LABELS[tf]}\n\n`;

    if (prevDate) {
      report += `_对比日期：${prevDate}_\n\n`;
    } else {
      report += `_首次记录，暂无历史数据可对比_\n\n`;
    }

    // 排行榜
    report += `### 排行榜\n\n`;
    report += formatTable(comparison.repos);
    report += "\n";

    // 新上榜
    if (comparison.newEntries.length > 0) {
      report += `### 🆕 新上榜项目（${comparison.newEntries.length} 个）\n\n`;
      for (const r of comparison.newEntries) {
        report += `- **[${r.name}](https://github.com/${r.name})** (${r.language || "N/A"}) - ${(r.descriptionZh || r.description || "").slice(0, 80)}\n`;
      }
      report += "\n";
    }

    // 掉出榜单
    if (comparison.dropped.length > 0) {
      report += `### 📉 掉出榜单（${comparison.dropped.length} 个）\n\n`;
      for (const r of comparison.dropped) {
        report += `- ~~${r.name}~~ （原排名 #${r.rank}）\n`;
      }
      report += "\n";
    }

    // 上升最快
    if (comparison.rising.length > 0) {
      report += `### 🚀 上升最快\n\n`;
      for (const r of comparison.rising) {
        report += `- **[${r.name}](https://github.com/${r.name})** 上升 ${r.change.slice(1)} 名\n`;
      }
      report += "\n";
    }

    report += "---\n\n";
  }

  const reportPath = path.join(REPORT_DIR, `report-${date}.md`);
  fs.writeFileSync(reportPath, report);
  console.log(`\n报告已保存：${reportPath}`);
  return reportPath;
}

// 主入口
const today = process.argv[2] || new Date().toISOString().slice(0, 10);
console.log(`正在生成 ${today} 的报告...`);
generateReport(today).catch(console.error);
