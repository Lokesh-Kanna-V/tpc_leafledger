"use client"

import { Button } from "@/shared/ui/button"
import { ButtonGroup } from "@/shared/ui/button-group"
import { Field } from "@/shared/ui/field"
import { Input } from "@/shared/ui/input"
import { cn } from "@/shared/lib/utils"
import { MONTH_OPTIONS } from "@/shared/config/constants"
import type { BookStatus } from "../types"

type BooksSearchFiltersProps = {
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  yearFilter: string
  onYearFilterChange: (value: string) => void
  bookYearOptions: string[]
  monthFilter: string
  onMonthFilterChange: (value: string) => void
}

export function BooksSearchFilters({
  searchQuery,
  onSearchQueryChange,
  yearFilter,
  onYearFilterChange,
  bookYearOptions,
  monthFilter,
  onMonthFilterChange,
}: BooksSearchFiltersProps) {
  return (
    <>
      <ButtonGroup>
        <Field orientation="horizontal">
          <Input
            type="search"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
          />
        </Field>
      </ButtonGroup>

      <select
        aria-label="Filter by year"
        className={cn(
          "h-8 w-auto min-w-27.5 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30"
        )}
        value={yearFilter}
        onChange={(e) => onYearFilterChange(e.target.value)}
      >
        <option value="all">All years</option>
        {bookYearOptions.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by month"
        className={cn(
          "h-8 w-auto min-w-32.5 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30"
        )}
        value={monthFilter}
        onChange={(e) => onMonthFilterChange(e.target.value)}
      >
        <option value="all">All months</option>
        {MONTH_OPTIONS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
    </>
  )
}

export function BooksTotalCount({
  totalBooks,
  busy,
}: {
  totalBooks: number
  busy: boolean
}) {
  return (
    <Button variant="outline" type="button" disabled={busy}>
      Total Books: <span className="font-bold">{totalBooks}</span>
    </Button>
  )
}

type BooksStatusFiltersProps = {
  statusFilter: "all" | BookStatus
  onStatusFilterChange: (
    updater: (f: "all" | BookStatus) => "all" | BookStatus
  ) => void
}

export function BooksStatusFilters({
  statusFilter,
  onStatusFilterChange,
}: BooksStatusFiltersProps) {
  return (
    <ButtonGroup>
      <Button
        variant={statusFilter === "all" ? "default" : "outline"}
        type="button"
        onClick={() => onStatusFilterChange(() => "all")}
      >
        All
      </Button>
      <Button
        variant={statusFilter === "current" ? "default" : "outline"}
        type="button"
        onClick={() =>
          onStatusFilterChange((f) => (f === "current" ? "all" : "current"))
        }
      >
        Current Books
      </Button>
      <Button
        variant={statusFilter === "completed" ? "default" : "outline"}
        type="button"
        onClick={() =>
          onStatusFilterChange((f) => (f === "completed" ? "all" : "completed"))
        }
      >
        Completed Books
      </Button>
      <Button
        variant={statusFilter === "store" ? "default" : "outline"}
        type="button"
        onClick={() =>
          onStatusFilterChange((f) => (f === "store" ? "all" : "store"))
        }
      >
        Stored Books
      </Button>
    </ButtonGroup>
  )
}
