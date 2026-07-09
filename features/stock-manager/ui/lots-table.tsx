"use client"

import { Button } from "@/shared/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table"
import { formatDate } from "@/shared/lib/date"
import type { Lot } from "../services/lots.service"

type LotsTableProps = {
  lots: Lot[]
  visibleLots: Lot[]
  busy: boolean
  onEdit: (lot: Lot) => void
  onDelete: (id: number, lotNumber: string) => void
}

export function LotsTable({
  lots,
  visibleLots,
  busy,
  onEdit,
  onDelete,
}: LotsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Lot number</TableHead>
          <TableHead>Book Serial from</TableHead>
          <TableHead>Book Serial to</TableHead>
          <TableHead className="text-right">Books</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-[200px] text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {visibleLots.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-muted-foreground">
              {lots.length === 0
                ? "No lots yet. Add one above."
                : "No lots match this view."}
            </TableCell>
          </TableRow>
        ) : (
          visibleLots.map((lot) => (
            <TableRow key={lot.id}>
              <TableCell>{lot.lot_number}</TableCell>
              <TableCell className="tabular-nums">{lot.book_from}</TableCell>
              <TableCell className="tabular-nums">{lot.book_to}</TableCell>
              <TableCell className="text-right tabular-nums">
                {lot.book_to - lot.book_from + 1}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatDate(lot.created_at)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    disabled={busy}
                    onClick={() => onEdit(lot)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    type="button"
                    disabled={busy}
                    onClick={() => onDelete(lot.id, lot.lot_number)}
                  >
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
