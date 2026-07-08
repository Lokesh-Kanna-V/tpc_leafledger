"use client"

import { Button } from "@/shared/ui/button"
import { ButtonGroup } from "@/shared/ui/button-group"
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

type BooksTableProps = {
  visibleBooks: BookRow[]
  pagedBooks: BookRow[]
  busy: boolean
  currentBookPage: number
  totalBookPages: number
  isBookFullyAccounted: (b: BookRow) => boolean
  onOpenDetail: (id: string) => void
  onToggleInFloor: (row: BookRow) => void
  onEdit: (row: BookRow) => void
  onPageChange: (updater: (p: number) => number) => void
}

export function BooksTable({
  visibleBooks,
  pagedBooks,
  busy,
  currentBookPage,
  totalBookPages,
  isBookFullyAccounted,
  onOpenDetail,
  onToggleInFloor,
  onEdit,
  onPageChange,
}: BooksTableProps) {
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Book Serial No.</TableHead>
            <TableHead>Office</TableHead>
            <TableHead>Leaf No.</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead>Assigned Date</TableHead>
            <TableHead className="w-[100px] text-center">In Floor</TableHead>
            <TableHead className="w-[110px] text-center">
              Accounted
            </TableHead>
            <TableHead className="w-[100px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleBooks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-muted-foreground">
                No books match this view.
              </TableCell>
            </TableRow>
          ) : (
            pagedBooks.map((b) => (
              <TableRow
                key={b.id}
                className="cursor-pointer hover:bg-muted/60"
                tabIndex={0}
                role="button"
                aria-label={`Open leaf details for book ${b.bookNo}`}
                onClick={() => onOpenDetail(b.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onOpenDetail(b.id)
                  }
                }}
              >
                <TableCell className="font-medium">{b.bookNo}</TableCell>
                <TableCell>{b.officeName ?? `Office #${b.officeId}`}</TableCell>
                <TableCell className="tabular-nums">
                  {b.hasLeafRange ? (
                    <>
                      {b.leafFrom} - {b.leafTo}{" "}
                      <span className="text-muted-foreground">
                        ({b.leafCount})
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">
                      Not assigned ({b.leafCount})
                    </span>
                  )}
                </TableCell>
                <TableCell>{b.assignedTo ?? "—"}</TableCell>
                <TableCell className="tabular-nums">
                  {b.assignedDate ? formatDate(b.assignedDate) : "—"}
                </TableCell>
                <TableCell className="text-center">
                  <div
                    className="flex justify-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      disabled={busy}
                      checked={b.inFloor}
                      onCheckedChange={() => onToggleInFloor(b)}
                      aria-label={`Toggle in floor for book ${b.bookNo}`}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      disabled
                      checked={isBookFullyAccounted(b)}
                      className="data-[state=checked]:border-green-600 data-[state=checked]:bg-green-600 data-[state=checked]:text-white dark:data-[state=checked]:bg-green-600"
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(b)
                    }}
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {currentBookPage} of {totalBookPages} · {visibleBooks.length}{" "}
          book
          {visibleBooks.length === 1 ? "" : "s"}
        </p>
        <ButtonGroup>
          <Button
            variant="outline"
            type="button"
            disabled={currentBookPage <= 1}
            onClick={() => onPageChange((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            type="button"
            disabled={currentBookPage >= totalBookPages}
            onClick={() =>
              onPageChange((p) => Math.min(totalBookPages, p + 1))
            }
          >
            Next
          </Button>
        </ButtonGroup>
      </div>
    </>
  )
}
