"use client"

import { ChevronLeft } from "lucide-react"

import { Button } from "@/shared/ui/button"
import { Checkbox } from "@/shared/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table"
import { formatDate } from "@/shared/lib/date"
import type { BookRow } from "../types"

type LeafDetailRow = {
  consignmentNo: number
  assignedTo: string
  assignedDate: string | null
  accounted: boolean
  accountedDate: string | null
}

type BookDetailViewProps = {
  detailBook: BookRow | undefined
  leafDetailRows: LeafDetailRow[]
  onBack: () => void
}

export function BookDetailView({
  detailBook,
  leafDetailRows,
  onBack,
}: BookDetailViewProps) {
  if (!detailBook) {
    return (
      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={onBack}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Back to books
        </Button>
        <p className="text-sm text-muted-foreground">Book not found.</p>
      </div>
    )
  }

  return (
    <div className="flex max-h-[calc(100vh-8rem)] min-h-0 flex-col">
      <div className="mb-4 flex shrink-0 flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={onBack}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Back to books
        </Button>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Book {detailBook.bookNo}
          </h2>
          <p className="text-sm text-muted-foreground">
            {detailBook.officeName ?? `Office #${detailBook.officeId}`} ·
            Leaves{" "}
            {detailBook.hasLeafRange
              ? `${detailBook.leafFrom}–${detailBook.leafTo} (${detailBook.leafCount})`
              : `Not assigned (${detailBook.leafCount})`}{" "}
            · Status: {detailBook.bookStatus}
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 shadow-sm">
            <TableRow>
              <TableHead className="w-[100px]">Consignment no.</TableHead>
              <TableHead>Assigned to</TableHead>
              <TableHead>Assigned date</TableHead>
              <TableHead className="w-[100px] text-center">
                Accounted
              </TableHead>
              <TableHead>Accounted date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leafDetailRows.map((row) => (
              <TableRow key={row.consignmentNo}>
                <TableCell className="font-medium tabular-nums">
                  {row.consignmentNo}
                </TableCell>
                <TableCell>{row.assignedTo}</TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {row.assignedDate ? formatDate(row.assignedDate) : "—"}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={row.accounted}
                      disabled
                      className="data-[state=checked]:border-green-600 data-[state=checked]:bg-green-600 data-[state=checked]:text-white dark:data-[state=checked]:bg-green-600"
                      aria-label={
                        row.accounted
                          ? `Consignment ${row.consignmentNo} accounted`
                          : `Consignment ${row.consignmentNo} not accounted`
                      }
                    />
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {row.accountedDate ? formatDate(row.accountedDate) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
