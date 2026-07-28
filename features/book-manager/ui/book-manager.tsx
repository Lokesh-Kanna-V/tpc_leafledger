"use client"

import type { Office } from "@/shared/services/offices.service"
import type { Employee } from "@/shared/services/employees.service"
import { AdminConfirmDialog } from "@/shared/ui/admin-confirm-dialog"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"

import type { Book } from "../services/books.service"
import type { Consumption } from "../services/consumption.service"
import type { BookRow } from "../types"
import { useBookManager } from "../hooks/use-book-manager"
import { BookDetailView } from "./book-detail-view"
import { AddBookDialog } from "./add-book-dialog"
import { AssignBookDialog } from "./assign-book-dialog"
import { AccountLeafDialog } from "./account-leaf-dialog"
import { UnaccountLeafDialog } from "./unaccount-leaf-dialog"
import { BulkAssignDialog } from "./bulk-assign-dialog"
import { EditBookDialog } from "./edit-book-dialog"
import {
  BooksSearchFilters,
  BooksStatusFilters,
  BooksTotalCount,
} from "./books-toolbar"
import { BooksTable } from "./books-table"

type BookManagerProps = {
  books: BookRow[]
  apiBooks: Book[]
  employees: Employee[]
  offices: Office[]
  consumptions: Consumption[]
  onReload: () => Promise<void>
  onBookUpdated: (book: Book) => void
}

export default function BookManager({
  books,
  apiBooks,
  employees,
  offices,
  consumptions,
  onReload,
  onBookUpdated,
}: BookManagerProps) {
  const bm = useBookManager({
    books,
    apiBooks,
    employees,
    offices,
    consumptions,
    onReload,
    onBookUpdated,
  })

  return (
    <div className="mt-10">
      {bm.detailBookId ? (
        <BookDetailView
          detailBook={bm.detailBook}
          leafDetailRows={bm.leafDetailRows}
          onBack={() => bm.setDetailBookId(null)}
        />
      ) : (
        <>
          <div className="mb-10 flex justify-between rounded-xl border border-gray-200 bg-gray-50 p-2">
            <div className="flex flex-wrap items-center gap-2">
              <AddBookDialog
                open={bm.dialogOpen}
                onOpenChange={bm.setDialogOpen}
                keepAddDialogOpenRef={bm.keepAddDialogOpenRef}
                offices={offices}
                bookNo={bm.bookNo}
                onBookNoChange={bm.setBookNo}
                officeId={bm.officeId}
                onOfficeIdChange={bm.setOfficeId}
                leafFrom={bm.leafFrom}
                onLeafFromChange={bm.setLeafFrom}
                leafTo={bm.leafTo}
                onLeafToChange={bm.setLeafTo}
                assignedTo={bm.assignedTo}
                onAssignedToChange={bm.setAssignedTo}
                assignedToOptions={bm.assignedToOptions}
                errors={bm.errors}
                leafCountLabel={bm.leafCountLabel}
                canAdd={bm.canAdd}
                busy={bm.busy}
                addActionError={bm.addActionError}
                onAddActionErrorClear={() => bm.setAddActionError(null)}
                onAddAndClose={async () => {
                  const ok = await bm.addBook()
                  if (!ok) return
                  bm.resetForm()
                  bm.setDialogOpen(false)
                }}
                onAddMore={async () => {
                  bm.setKeepAddDialogOpen(true)
                  const ok = await bm.addBook()
                  if (!ok) return
                  bm.resetFormKeepOffice()
                  bm.setDialogOpen(true)
                  setTimeout(() => {
                    bm.setKeepAddDialogOpen(false)
                  }, 0)
                }}
              />

              <AssignBookDialog
                open={bm.assignDialogOpen}
                onOpenChange={bm.setAssignDialogOpen}
                bookNoOptions={bm.bookNoOptions}
                employeesSortedForAssign={bm.employeesSortedForAssign}
                assignBookNo={bm.assignBookNo}
                onAssignBookNoChange={bm.setAssignBookNo}
                assignEmployeeId={bm.assignEmployeeId}
                onAssignEmployeeIdChange={bm.setAssignEmployeeId}
                assignNewEmployeeName={bm.assignNewEmployeeName}
                onAssignNewEmployeeNameChange={bm.setAssignNewEmployeeName}
                assignNewEmployeeRole={bm.assignNewEmployeeRole}
                onAssignNewEmployeeRoleChange={bm.setAssignNewEmployeeRole}
                assignNewBook={bm.assignNewBook}
                onAssignNewBookChange={bm.setAssignNewBook}
                assignLeafFrom={bm.assignLeafFrom}
                onAssignLeafFromChange={bm.setAssignLeafFrom}
                errors={bm.assignErrors}
                canAssign={bm.canAssign}
                busy={bm.busy}
                assignActionError={bm.assignActionError}
                onClearError={() => bm.setAssignActionError(null)}
                onAssignAndClose={async () => {
                  const ok = await bm.assignBook()
                  if (!ok) return
                  bm.resetAssignForm()
                  bm.setAssignDialogOpen(false)
                }}
                onAssignMore={async () => {
                  const ok = await bm.assignBook()
                  if (!ok) return
                  bm.resetAssignFormKeepEmployee()
                  bm.setAssignDialogOpen(true)
                }}
              />

              <AccountLeafDialog
                open={bm.accountDialogOpen}
                onOpenChange={bm.setAccountDialogOpen}
                accountConsignmentNo={bm.accountConsignmentNo}
                onAccountConsignmentNoChange={bm.setAccountConsignmentNo}
                accountLeafTo={bm.accountLeafTo}
                onAccountLeafToChange={bm.setAccountLeafTo}
                accountLeafInputRef={bm.accountLeafInputRef}
                errors={bm.accountErrors}
                canAccount={bm.canAccount}
                busy={bm.busy}
                accountActionError={bm.accountActionError}
                onClearError={() => bm.setAccountActionError(null)}
                onAccountAndClose={async () => {
                  const ok = await bm.accountLeaves()
                  if (!ok) return
                  bm.resetAccountForm()
                  bm.setAccountDialogOpen(false)
                }}
                onAccountAnother={async () => {
                  const ok = await bm.accountLeaves()
                  if (!ok) return
                  bm.resetAccountForm()
                  bm.setAccountDialogOpen(true)
                  requestAnimationFrame(() => {
                    bm.accountLeafInputRef.current?.focus()
                  })
                }}
              />

              <BulkAssignDialog
                open={bm.bulkDialogOpen}
                onOpenChange={(open) => {
                  bm.setBulkDialogOpen(open)
                  if (open) bm.resetBulkForm()
                }}
                offices={offices}
                employeesSortedForAssign={bm.employeesSortedForAssign}
                bulkStep={bm.bulkStep}
                bulkBookFrom={bm.bulkBookFrom}
                onBulkBookFromChange={bm.setBulkBookFrom}
                bulkBookTo={bm.bulkBookTo}
                onBulkBookToChange={bm.setBulkBookTo}
                bulkOfficeId={bm.bulkOfficeId}
                onBulkOfficeIdChange={bm.setBulkOfficeId}
                bulkEmployeeId={bm.bulkEmployeeId}
                onBulkEmployeeIdChange={bm.setBulkEmployeeId}
                bulkNewEmployeeName={bm.bulkNewEmployeeName}
                onBulkNewEmployeeNameChange={bm.setBulkNewEmployeeName}
                bulkNewEmployeeRole={bm.bulkNewEmployeeRole}
                onBulkNewEmployeeRoleChange={bm.setBulkNewEmployeeRole}
                bulkActionError={bm.bulkActionError}
                bulkResultMessage={bm.bulkResultMessage}
                bulkFormErrors={bm.bulkFormErrors}
                canStartBulk={bm.canStartBulk}
                bulkCurrentLeafBook={bm.bulkCurrentLeafBook}
                bulkLeafTotal={bm.bulkLeafTotal}
                bulkPendingLeafBookIdsCount={bm.bulkPendingLeafBookIds.length}
                bulkLeafFrom={bm.bulkLeafFrom}
                onBulkLeafFromChange={bm.setBulkLeafFrom}
                bulkLeafTo={bm.bulkLeafTo}
                onBulkLeafToChange={bm.setBulkLeafTo}
                bulkLeafErrors={bm.bulkLeafErrors}
                canSaveBulkLeafRange={bm.canSaveBulkLeafRange}
                busy={bm.busy}
                onNext={() => void bm.startBulkAssign()}
                onSaveLeafRange={() => void bm.saveBulkLeafRangeForCurrentBook()}
              />

              <UnaccountLeafDialog
                open={bm.unaccountDialogOpen}
                onOpenChange={bm.setUnaccountDialogOpen}
                unaccountConsignmentNo={bm.unaccountConsignmentNo}
                onUnaccountConsignmentNoChange={bm.setUnaccountConsignmentNo}
                unaccountLeafTo={bm.unaccountLeafTo}
                onUnaccountLeafToChange={bm.setUnaccountLeafTo}
                unaccountLeafInputRef={bm.unaccountLeafInputRef}
                errors={bm.unaccountErrors}
                canUnaccount={bm.canUnaccount}
                busy={bm.busy}
                unaccountActionError={bm.unaccountActionError}
                onClearError={() => bm.setUnaccountActionError(null)}
                onUnaccountAndClose={async () => {
                  const ok = await bm.unaccountLeaves()
                  if (!ok) return
                  bm.resetUnaccountForm()
                  bm.setUnaccountDialogOpen(false)
                }}
                onUnaccountAnother={async () => {
                  const ok = await bm.unaccountLeaves()
                  if (!ok) return
                  bm.resetUnaccountForm()
                  bm.setUnaccountDialogOpen(true)
                  requestAnimationFrame(() => {
                    bm.unaccountLeafInputRef.current?.focus()
                  })
                }}
              />

              <BooksSearchFilters
                searchQuery={bm.searchQuery}
                onSearchQueryChange={(v) => {
                  bm.setSearchQuery(v)
                  bm.setPage(1)
                }}
                yearFilter={bm.yearFilter}
                onYearFilterChange={(v) => {
                  bm.setYearFilter(v)
                  bm.setPage(1)
                }}
                bookYearOptions={bm.bookYearOptions}
                monthFilter={bm.monthFilter}
                onMonthFilterChange={(v) => {
                  bm.setMonthFilter(v)
                  bm.setPage(1)
                }}
              />
            </div>

            <BooksTotalCount totalBooks={books.length} busy={bm.busy} />

            <BooksStatusFilters
              statusFilter={bm.statusFilter}
              onStatusFilterChange={(updater) => {
                bm.setStatusFilter(updater)
                bm.setPage(1)
              }}
            />
          </div>

          <EditBookDialog
            open={bm.editDialogOpen}
            onOpenChange={(open) => {
              bm.setEditDialogOpen(open)
              if (open) bm.setEditActionError(null)
            }}
            offices={offices}
            employeesSortedForAssign={bm.employeesSortedForAssign}
            editBookNo={bm.editBookNo}
            onEditBookNoChange={bm.setEditBookNo}
            editOfficeId={bm.editOfficeId}
            onEditOfficeIdChange={bm.setEditOfficeId}
            editLeafFrom={bm.editLeafFrom}
            onEditLeafFromChange={bm.setEditLeafFrom}
            editLeafTo={bm.editLeafTo}
            onEditLeafToChange={bm.setEditLeafTo}
            editEmployeeId={bm.editEmployeeId}
            onEditEmployeeIdChange={bm.setEditEmployeeId}
            editNewEmployeeName={bm.editNewEmployeeName}
            onEditNewEmployeeNameChange={bm.setEditNewEmployeeName}
            editNewEmployeeRole={bm.editNewEmployeeRole}
            onEditNewEmployeeRoleChange={bm.setEditNewEmployeeRole}
            errors={bm.editErrors}
            canEditSave={bm.canEditSave}
            busy={bm.busy}
            editActionError={bm.editActionError}
            onSave={async () => {
              const ok = await bm.saveEdit()
              if (!ok) return
              bm.setEditDialogOpen(false)
            }}
          />

          <BooksTable
            visibleBooks={bm.visibleBooks}
            pagedBooks={bm.pagedBooks}
            busy={bm.busy}
            currentBookPage={bm.currentBookPage}
            totalBookPages={bm.totalBookPages}
            isBookFullyAccounted={bm.isBookFullyAccounted}
            onOpenDetail={(id) => bm.setDetailBookId(id)}
            onToggleInFloor={(row) => void bm.toggleInFloor(row)}
            onEdit={(row) => bm.openEditDialog(row)}
            onDelete={(row) => bm.deleteBookRow(row)}
            onPageChange={bm.setPage}
          />

          <ConfirmDialog
            key={`confirm-${bm.pendingDeleteRow?.dbId ?? "closed"}`}
            open={bm.deleteConfirmOpen}
            onOpenChange={bm.setDeleteConfirmOpen}
            title="Delete book"
            description={
              bm.pendingDeleteRow
                ? `Delete book ${bm.pendingDeleteRow.bookNo}? This also deletes its leaves. This cannot be undone.`
                : ""
            }
            busy={bm.busy}
            error={bm.deleteActionError}
            onConfirm={() => void bm.confirmDeleteBookRow()}
          />

          <AdminConfirmDialog
            key={`admin-${bm.pendingDeleteBookId ?? "closed"}`}
            open={bm.deleteAdminOpen}
            onOpenChange={bm.setDeleteAdminOpen}
            title="Confirm deletion"
            description="This book is assigned to an office or an employee. Enter an admin name and password to delete it (and its leaves) anyway."
            busy={bm.busy}
            error={bm.deleteAdminError}
            onConfirm={(name, password) =>
              void bm.confirmDeleteBookWithAdmin(name, password)
            }
          />
        </>
      )}
    </div>
  )
}
