"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { getEmployees, type Employee } from "@/shared/services/employees.service"
import { getOffices, type Office } from "@/shared/services/offices.service"
import { getLots, type Lot } from "@/features/stock-manager"
import {
  getOverdueAlerts,
  type AccountingOverdueAlert,
} from "@/features/alerts"
import {
  getBooks,
  getConsumptions,
  rowsFromDatabase,
  type Book,
  type Consumption,
} from "@/features/book-manager"

export function useAppData() {
  const [apiBooks, setApiBooks] = useState<Book[]>([])
  const [consumptions, setConsumptions] = useState<Consumption[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [offices, setOffices] = useState<Office[]>([])
  const [lots, setLots] = useState<Lot[]>([])
  const [alertCount, setAlertCount] = useState<number>(0)
  const [alerts, setAlerts] = useState<AccountingOverdueAlert[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  const reloadData = useCallback(async () => {
    setDataLoading(true)
    try {
      const [b, c, e, o, l] = await Promise.all([
        getBooks(),
        getConsumptions(),
        getEmployees(),
        getOffices(),
        getLots(),
      ])
      setApiBooks(b)
      setConsumptions(c)
      setEmployees(e)
      setOffices(o)
      setLots(l)
      try {
        const overdueAlerts = await getOverdueAlerts()
        setAlerts(overdueAlerts)
        setAlertCount(overdueAlerts.length)
      } catch {
        setAlerts([])
        setAlertCount(0)
      }
      setDataError(null)
    } catch (err) {
      setDataError(
        err instanceof Error ? err.message : "Failed to load application data"
      )
    } finally {
      setDataLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch loads books/employees/etc.
    void reloadData()
  }, [reloadData])

  const bookRows = useMemo(
    () => rowsFromDatabase(apiBooks, consumptions, employees, offices),
    [apiBooks, consumptions, employees, offices]
  )

  return {
    apiBooks,
    consumptions,
    employees,
    offices,
    lots,
    alertCount,
    alerts,
    dataLoading,
    dataError,
    reloadData,
    bookRows,
  }
}
