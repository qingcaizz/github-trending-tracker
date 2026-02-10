# Report Format Reference

## File Locations

- Data: `~/.claude/github-trending/data/{timeframe}-{YYYY-MM-DD}.json`
- Reports: `~/.claude/github-trending/reports/report-{YYYY-MM-DD}.md`

## JSON Data Structure

```json
{
  "date": "2025-01-15",
  "timeframe": "daily",
  "repos": [
    {
      "rank": 1,
      "name": "owner/repo",
      "description": "...",
      "language": "Python",
      "totalStars": "12,345",
      "forks": "1,234",
      "starsGained": 500,
      "gainPeriod": "today"
    }
  ]
}
```

## Change Indicators

| Indicator | Meaning |
|-----------|---------|
| `NEW` | First appearance on the list |
| `+N` | Moved up N positions |
| `-N` | Moved down N positions |
| `=` | Same position |
| `OUT` | Was on previous list, now gone |

## Report Sections

1. **Header** - Date and generation timestamp
2. **Per-timeframe block** (daily/weekly/monthly):
   - Comparison date reference
   - Top repositories table (max 25)
   - New entries list
   - Dropped off list
   - Rising stars (top 5 biggest rank jumps)
3. **Separator** between timeframes
