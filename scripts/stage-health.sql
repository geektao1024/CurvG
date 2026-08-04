-- Stage/provider health from per-attempt telemetry (animation_planning_attempt).
-- Run: npx wrangler d1 execute curvg-db --remote --file scripts/stage-health.sql
-- Delivery-only counts live in animation_planning_stage; this table records
-- every failover attempt, so these numbers are true provider health.

-- 1. Attempt success rate per provider/model (last 7 days).
SELECT provider,
       model,
       COUNT(*) AS attempts,
       SUM(status = 'ok') AS ok,
       ROUND(100.0 * SUM(status = 'ok') / COUNT(*), 1) AS ok_pct,
       ROUND(AVG(latency_ms) / 1000.0, 1) AS avg_s,
       MAX(latency_ms) / 1000 AS max_s
FROM animation_planning_attempt
WHERE created_at >= (strftime('%s', 'now') - 7 * 86400) * 1000
GROUP BY provider, model
ORDER BY attempts DESC;

-- 2. Failure codes per stage (last 7 days).
SELECT stage,
       error_code,
       COUNT(*) AS n
FROM animation_planning_attempt
WHERE status = 'failed'
  AND created_at >= (strftime('%s', 'now') - 7 * 86400) * 1000
GROUP BY stage, error_code
ORDER BY n DESC;

-- 3. How often the primary fails and a later target recovers (per day).
SELECT date(created_at / 1000, 'unixepoch') AS d,
       SUM(attempt_no = 1 AND status = 'failed') AS primary_failed,
       SUM(attempt_no > 1 AND status = 'ok') AS recovered_by_fallback,
       COUNT(DISTINCT run_id) AS runs
FROM animation_planning_attempt
GROUP BY d
ORDER BY d DESC
LIMIT 14;
