import { runOverdueAccountingAlerts } from "./overdue-alerts.mjs"

const HOUR_MS = 60 * 60 * 1000

function next9amDelayMs() {
  const now = new Date()
  const next = new Date(now)
  next.setHours(9, 0, 0, 0)
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1)
  }
  return next.getTime() - now.getTime()
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  // Loop forever; run once per day at 09:00 (container timezone).
  while (true) {
    const delay = next9amDelayMs()
    console.log(`[worker] next run in ${Math.round(delay / 1000)}s`)

    // Sleep in chunks so container logs/health still show periodic activity.
    let remaining = delay
    while (remaining > 0) {
      const chunk = Math.min(remaining, HOUR_MS)
      await sleep(chunk)
      remaining -= chunk
    }

    try {
      const r = await runOverdueAccountingAlerts()
      console.log(`[worker] run complete: ${r.active} active alerts`)
    } catch (err) {
      console.error("[worker] run failed:", err)
    }
  }
}

await main()

