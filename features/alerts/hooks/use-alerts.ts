"use client"

import { useEffect, useMemo, useState } from "react"

import {
  getOverdueAlerts,
  type AccountingOverdueAlert,
} from "../services/alerts.service"

export function useAlerts() {
  const [alerts, setAlerts] = useState<AccountingOverdueAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const data = await getOverdueAlerts()
        if (cancelled) return
        setAlerts(data)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to load alerts")
      } finally {
        if (cancelled) return
        setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  const totalOverdueLeaves = useMemo(
    () => alerts.reduce((sum, a) => sum + (a.payload?.overdueCount ?? 0), 0),
    [alerts]
  )

  return { alerts, loading, error, totalOverdueLeaves }
}
