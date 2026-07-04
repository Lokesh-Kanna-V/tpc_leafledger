"use client"

import { useMemo } from "react"
import {
  BookCheckIcon,
  BookOpenIcon,
  BookXIcon,
  LayoutDashboardIcon,
  UserRoundCheckIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { BookRow } from "@/lib/books"
import type { AccountingOverdueAlert } from "@/lib/api/alerts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function isBookAccounted(b: BookRow) {
  const totalBookLeaves = b.leafCount
  const accountedThrough = b.accountedThrough ?? b.leafFrom - 1
  const accountedBookLeaves =
    accountedThrough < b.leafFrom
      ? 0
      : Math.min(accountedThrough, b.leafTo) - b.leafFrom + 1
  return accountedBookLeaves >= totalBookLeaves
}

export default function Dashboard({
  books,
  alerts,
  onOpenAlerts,
}: {
  books: BookRow[]
  alerts: AccountingOverdueAlert[]
  onOpenAlerts: () => void
}) {
  const dashboard = useMemo(() => {
    const currentBooks = books.filter(
      (b) => String(b.bookStatus ?? "").toLowerCase() === "current"
    )
    const storeBooks = books.filter(
      (b) => String(b.bookStatus ?? "").toLowerCase() === "store" && !b.inFloor
    )

    const total = books.length

    const totalLeavesAllBooks = books.reduce((sum, b) => sum + b.leafCount, 0)

    const totalCurrentLeaves = currentBooks.reduce(
      (sum, b) => sum + b.leafCount,
      0
    )

    const accountedCurrentLeaves = currentBooks.reduce(
      (sum, b) => sum + b.accountedLeafCount,
      0
    )
    const unaccountedCurrentLeaves = Math.max(
      0,
      totalCurrentLeaves - accountedCurrentLeaves
    )

    const accountedPct = totalCurrentLeaves
      ? Math.round((accountedCurrentLeaves / totalCurrentLeaves) * 100)
      : 0

    const accountedBooks = books.filter(isBookAccounted).length
    const unaccountedBooks = total - accountedBooks

    const currentBookCount = currentBooks.length

    const avgLeavesPerBook = total
      ? Math.round((totalLeavesAllBooks / total) * 10) / 10
      : 0

    const storedBookLeaves = storeBooks.reduce(
      (sum, b) => sum + b.leafCount,
      0
    )

    const inFloorBooks = books.filter((b) => b.inFloor && !isBookAccounted(b))
    const inFloorCount = inFloorBooks.length
    const inFloorLeaves = inFloorBooks.reduce((sum, b) => sum + b.leafCount, 0)
    const inFloorAvgLeaves = inFloorCount
      ? Math.round((inFloorLeaves / inFloorCount) * 10) / 10
      : 0

    const needsAccounting = books.filter((b) => !isBookAccounted(b)).slice(0, 5)

    const byAssignee = Object.entries(
      books.reduce<
        Record<string, { total: number; unaccounted: number; leaves: number }>
      >((acc, b) => {
        const key = (b.assignedTo ?? "Unassigned").trim() || "Unassigned"
        const leaves = b.leafCount
        acc[key] ??= { total: 0, unaccounted: 0, leaves: 0 }
        acc[key].total += 1
        acc[key].leaves += leaves
        if (!isBookAccounted(b)) acc[key].unaccounted += 1
        return acc
      }, {})
    )
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total)

    const recent = [...books].slice(0, 5)

    return {
      total,
      totalLeaves: totalLeavesAllBooks,
      avgLeaves: avgLeavesPerBook,
      accountedLeaves: accountedCurrentLeaves,
      unaccountedLeaves: unaccountedCurrentLeaves,
      accountedPct,
      accountedBooks,
      unaccountedBooks,
      currentBookCount,
      currentBookLeaves: totalCurrentLeaves,
      storedBooks: storeBooks.length,
      storedBookLeaves,
      inFloorCount,
      inFloorLeaves,
      inFloorAvgLeaves,
      needsAccounting,
      byAssignee,
      recent,
    }
  }, [books])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <LayoutDashboardIcon />
        <h1 className="text-xl font-bold">DASHBOARD</h1>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card size="sm">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center justify-between">
              Stored
              <BookXIcon className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
            <CardDescription>Books currently in store</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">
              {dashboard.storedBooks}
            </div>
            <div className="mt-1 text-sm text-muted-foreground tabular-nums">
              {dashboard.storedBookLeaves} leaves in store
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center justify-between">
              In Floor
              <BookOpenIcon className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
            <CardDescription>In floor and not yet accounted</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">
              {dashboard.inFloorCount}
            </div>
            <div className="mt-1 text-sm text-muted-foreground tabular-nums">
              {dashboard.inFloorLeaves} leaves • avg {dashboard.inFloorAvgLeaves}
              /book
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center justify-between">
              Current
              <UserRoundCheckIcon className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
            <CardDescription>Books currently in use</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">
              {dashboard.currentBookCount}
            </div>
            <div className="mt-1 text-sm text-muted-foreground tabular-nums">
              {dashboard.currentBookLeaves} leaves in current
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center justify-between">
              Accounted
              <BookCheckIcon className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
            <CardDescription>Leaves accounted</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">
              {dashboard.accountedLeaves}
            </div>
            <div className="mt-1 text-sm text-muted-foreground tabular-nums">
              {dashboard.unaccountedLeaves} leaves pending
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {/* <Card className="xl:col-span-2" size="sm">
          <CardHeader className="border-b">
            <CardTitle>Recent books</CardTitle>
            <CardDescription>
              Quick overview of book ranges and assignment
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Book No.</TableHead>
                  <TableHead>Leaf range</TableHead>
                  <TableHead>Assigned to</TableHead>
                  <TableHead className="pr-4 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.recent.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="pl-4 font-medium">
                      {b.bookNo}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {b.leafFrom}–{b.leafTo}{" "}
                      <span className="text-muted-foreground">
                        ({b.leafTo - b.leafFrom + 1})
                      </span>
                    </TableCell>
                    <TableCell>{b.assignedTo ?? "—"}</TableCell>
                    <TableCell className="pr-4 text-right">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
                          isBookAccounted(b)
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        )}
                      >
                        {isBookAccounted(b) ? "Accounted" : "Pending"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card> */}

        <Card
          size="sm"
          className={cn(
            alerts.length
              ? "relative overflow-hidden border-red-500 bg-red-50/90 shadow-2xl ring-4 ring-red-300"
              : undefined
          )}
        >
          <CardHeader
            className={cn(alerts.length ? "border-red-200" : "border-b")}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className={cn(alerts.length ? "text-red-900" : "")}>
                  Needs attention
                </CardTitle>
                <CardDescription>From Alerts</CardDescription>
              </div>
              <button
                type="button"
                onClick={onOpenAlerts}
                className="text-sm font-medium text-primary hover:underline"
              >
                View all
              </button>
            </div>
            {alerts.length ? (
              <div className="pointer-events-none absolute inset-0 -z-10 animate-pulse bg-linear-to-r from-red-100/70 via-transparent to-red-100/70" />
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div
              className={cn(
                "rounded-lg border px-3 py-2",
                alerts.length
                  ? "border-red-200 bg-white/60 shadow-sm"
                  : "bg-muted/30"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium">Overdue accounting</div>
                <div className="text-sm font-semibold tabular-nums">
                  {alerts.length}
                </div>
              </div>
              <Separator className="my-2" />
              <div className="flex flex-col gap-1.5 text-sm">
                {alerts.length ? (
                  alerts.slice(0, 5).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={onOpenAlerts}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left hover:bg-muted"
                      title="Open Alerts"
                    >
                      <div className="font-medium">
                        Book {a.book?.book_number ?? `#${a.book_id ?? "—"}`}
                      </div>
                      <div className="text-muted-foreground tabular-nums">
                        {a.payload?.daysPassed ?? "—"}d
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-muted-foreground">
                    No alerts right now.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card size="sm">
          <CardHeader className="border-b">
            <CardTitle>Next actions</CardTitle>
            <CardDescription>What you can do right now</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 text-sm">
              <div className="rounded-lg border bg-muted/30 px-3 py-2">
                <div className="font-medium">Add new books</div>
                <div className="text-muted-foreground">
                  Create a book with a 1–50 leaf range.
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 px-3 py-2">
                <div className="font-medium">Assign books</div>
                <div className="text-muted-foreground">
                  Set assignee and starting leaf.
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 px-3 py-2">
                <div className="font-medium">Account leaves</div>
                <div className="text-muted-foreground">
                  Account leaves to auto-complete books.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2" size="sm">
          <CardHeader className="border-b">
            <CardTitle>By assignee</CardTitle>
            <CardDescription>
              Workload and pending accounting per assignee
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Assignee</TableHead>
                  <TableHead className="text-right">Books</TableHead>
                  <TableHead className="text-right">Leaves</TableHead>
                  <TableHead className="pr-4 text-right">Pending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.byAssignee.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell className="pl-4 font-medium">
                      {row.name}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.total}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.leaves}
                    </TableCell>
                    <TableCell className="pr-4 text-right tabular-nums">
                      {row.unaccounted}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div> */}
    </div>
  )
}
