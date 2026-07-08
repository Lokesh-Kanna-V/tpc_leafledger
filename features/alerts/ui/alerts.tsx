"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table"
import { formatDate } from "@/shared/lib/date"
import { useAlerts } from "../hooks/use-alerts"

export default function Alerts() {
  const { alerts, loading, error, totalOverdueLeaves } = useAlerts()

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
            <TableHead>Assigned to</TableHead>
            <TableHead>Overdue leaves</TableHead>
            <TableHead>Oldest assigned</TableHead>
            <TableHead>Days passed</TableHead>
            <TableHead>Allowed days</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((a) => (
            <TableRow key={a.id}>
              <TableCell>{a.book?.office?.name ?? "—"}</TableCell>
              <TableCell>{a.book?.book_number ?? `#${a.book_id ?? "—"}`}</TableCell>
              <TableCell>
                {a.payload?.assignedTo?.length ? a.payload.assignedTo.join(", ") : "—"}
              </TableCell>
              <TableCell>{a.payload?.overdueCount ?? "—"}</TableCell>
              <TableCell>
                {a.payload?.oldestAssignedDate
                  ? formatDate(a.payload.oldestAssignedDate)
                  : "—"}
              </TableCell>
              <TableCell>{a.payload?.daysPassed ?? "—"}</TableCell>
              <TableCell>{a.payload?.thresholdDays ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
