#!/usr/bin/env bash
# Requests pages with the five AI crawler user agents from
# docs/GPT_TRAFFIC_CHECKLIST.md and prints status, <h1> count and whether the
# HTML carries FAQPage / <details> answers. Read-only.
#
#   scripts/ai-crawler-check.sh [base_url] [path ...]
#   scripts/ai-crawler-check.sh https://curvg.com / /labs/geometry /pricing
set -u
BASE=${1:-https://curvg.com}
shift || true
PATHS=("$@")
if [ ${#PATHS[@]} -eq 0 ]; then
  PATHS=(/ /labs /labs/geometry /curves /wonders /pricing /creator /manim-alternative /blog/best-math-video-apps /llms.txt)
fi
UAS=(
  "OAI-SearchBot|Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)"
  "GPTBot|Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)"
  "ChatGPT-User|Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot"
  "PerplexityBot|Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)"
  "ClaudeBot|Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)"
)
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT
for p in "${PATHS[@]}"; do
  for entry in "${UAS[@]}"; do
    name=${entry%%|*}
    ua=${entry#*|}
    meta=$(curl -s --max-time 30 -A "$ua" -o "$TMP" -w '%{http_code} %{time_total}' "$BASE$p")
    h1=$(grep -ao '<h1' "$TMP" | wc -l | tr -d ' ')
    faq=$(grep -ao '"FAQPage"' "$TMP" | wc -l | tr -d ' ')
    det=$(grep -ao '<details' "$TMP" | wc -l | tr -d ' ')
    printf '%-34s %-14s %s h1=%s faqLD=%s details=%s\n' "$p" "$name" "$meta" "$h1" "$faq" "$det"
  done
done
