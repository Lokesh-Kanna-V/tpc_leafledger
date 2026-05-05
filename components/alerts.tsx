"use client"

import { useEffect, useMemo, useState } from "react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getOverdueAlerts, type AccountingOverdueAlert } from "@/lib/api/alerts"

function formatDate(iso: string): string {
  // assigned_date is stored as DATE, we keep the ISO YYYY-MM-DD part for display.
  return iso.slice(0, 10)
}

export default function Alerts() {
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
    [alerts],
  )

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading alerts…</p>
  }

  if (error) {
    return (
      <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error}
      </p>
    )
  }

  if (alerts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No overdue accounting alerts. You’re all caught up.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {alerts.length} book{alerts.length === 1 ? "" : "s"} with overdue leaves
        (total overdue leaves: {totalOverdueLeaves}).
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Office</TableHead>
            <TableHead>Book</TableHead>
            <TableHead>Overdue leaves</TableHead>
            <TableHead>Oldest assigned</TableHead>
            <TableHead>Days overdue</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((a) => (
            <TableRow key={a.id}>
              <TableCell>{a.book?.office?.name ?? "—"}</TableCell>
              <TableCell>{a.book?.book_number ?? `#${a.book_id ?? "—"}`}</TableCell>
              <TableCell>{a.payload?.overdueCount ?? "—"}</TableCell>
              <TableCell>
                {a.payload?.oldestAssignedDate
                  ? formatDate(a.payload.oldestAssignedDate)
                  : "—"}
              </TableCell>
              <TableCell>{a.payload?.daysOverdue ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

