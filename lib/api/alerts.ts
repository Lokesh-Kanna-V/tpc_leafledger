import { parseResponse } from "@/lib/api/request"

export type AccountingOverdueAlert = {
  id: number
  type: "ACCOUNTING_OVERDUE"
  book_id: number | null
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  payload: {
    overdueCount: number
    oldestAssignedDate: string
    daysOverdue: number
  }
  book: null | {
    id: number
    book_number: string
    office: null | { id: number; name: string }
  }
}

export async function getOverdueAlerts(): Promise<AccountingOverdueAlert[]> {
  const response = await fetch("/api/alerts", { method: "GET" })
  const data = await parseResponse<AccountingOverdueAlert[]>(response)
  return Array.isArray(data) ? data : []
}

