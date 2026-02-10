#!/usr/bin/env node

/**
 * GitHub Trending Fetcher
 * Fetches trending repos from GitHub for daily, weekly, monthly timeframes.
 * Saves JSON data to ~/.claude/github-trending/data/
 */

const https = require("https");
const fs = require("fs");
const path = require("path");
const os = require("os");

const DATA_DIR = path.join(os.homedir(), ".claude", "github-trending", "data");
const TIMEFRAMES = ["daily", "weekly", "monthly"];
const GITHUB_TRENDING_URL = "https://github.com/trending";

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "text/html",
          "Accept-Language": "en-US,en;q=0.9",
        },
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchPage(res.headers.location).then(resolve).catch(reject);
          return;
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
        res.on("error", reject);
      }
    ).on("error", reject);
  });
}

function stripTags(html) {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function extractNumber(html) {
  // Remove all HTML tags first, then extract the number
  const text = stripTags(html);
  const match = text.match(/([\d,]+)/);
  return match ? match[1].trim() : "0";
}

function parseTrendingHTML(html) {
  const repos = [];
  const articleRegex = /<article class="Box-row">([\s\S]*?)<\/article>/g;
  let match;

  while ((match = articleRegex.exec(html)) !== null) {
    const block = match[1];

    // Repo full name from h2 > a[href]
    const repoMatch = block.match(/<h2[^>]*>[\s\S]*?href="\/([\w.-]+\/[\w.-]+)"[\s\S]*?<\/h2>/);
    if (!repoMatch) continue;
    const fullName = repoMatch[1].trim();

    // Description
    const descMatch = block.match(/<p class="[^"]*">([\s\S]*?)<\/p>/);
    const description = descMatch ? stripTags(descMatch[1]) : "";

    // Language
    const langMatch = block.match(/itemprop="programmingLanguage">([\s\S]*?)<\/span>/);
    const language = langMatch ? langMatch[1].trim() : "";

    // Total stars: find the stargazers link, then extract number after </svg>
    const starsBlockMatch = block.match(/href="\/[^"]*\/stargazers"[^>]*>[\s\S]*?<\/svg>([\s\S]*?)<\/a>/);
    const totalStars = starsBlockMatch ? extractNumber(starsBlockMatch[1]) : "0";

    // Forks: same approach
    const forksBlockMatch = block.match(/href="\/[^"]*\/forks"[^>]*>[\s\S]*?<\/svg>([\s\S]*?)<\/a>/);
    const forks = forksBlockMatch ? extractNumber(forksBlockMatch[1]) : "0";

    // Stars gained period
    const gainMatch = block.match(/([\d,]+)\s+stars\s+(today|this week|this month)/i);
    const starsGained = gainMatch ? parseInt(gainMatch[1].replace(/,/g, ""), 10) : 0;
    const gainPeriod = gainMatch ? gainMatch[2] : "";

    repos.push({
      rank: repos.length + 1,
      name: fullName,
      description,
      language,
      totalStars,
      forks,
      starsGained,
      gainPeriod,
    });
  }

  return repos;
}

async function fetchTrending(timeframe) {
  const url = `${GITHUB_TRENDING_URL}?since=${timeframe}`;
  console.log(`Fetching ${timeframe} trending from: ${url}`);

  const html = await fetchPage(url);
  const repos = parseTrendingHTML(html);
  console.log(`  Found ${repos.length} repos for ${timeframe}`);
  return repos;
}

async function main() {
  ensureDir(DATA_DIR);
  const today = new Date().toISOString().slice(0, 10);

  for (const tf of TIMEFRAMES) {
    try {
      const repos = await fetchTrending(tf);
      const filename = `${tf}-${today}.json`;
      const filepath = path.join(DATA_DIR, filename);
      fs.writeFileSync(filepath, JSON.stringify({ date: today, timeframe: tf, repos }, null, 2));
      console.log(`  Saved: ${filepath}`);
    } catch (err) {
      console.error(`  Error fetching ${tf}: ${err.message}`);
    }
  }

  console.log("\nDone! Data saved to:", DATA_DIR);
}

main().catch(console.error);
