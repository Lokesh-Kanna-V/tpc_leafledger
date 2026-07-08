"use client"

import { useState } from "react"
import { BookOpenIcon, BoxesIcon, Building2Icon, BellIcon } from "lucide-react"

import { Dashboard } from "@/features/dashboard"
import { BookManager } from "@/features/book-manager"
import { StockManager } from "@/features/stock-manager"
import { OfficeManagement } from "@/features/office-management"
import { Alerts } from "@/features/alerts"

import { useAppData } from "../hooks/use-app-data"
import { SidebarNav } from "./sidebar-nav"

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [active, setActive] = useState("Dashboard")
  const [logoutBusy, setLogoutBusy] = useState(false)

  const {
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
  } = useAppData()

  async function handleLogout() {
    setLogoutBusy(true)
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      })
      window.location.href = "/"
    } finally {
      setLogoutBusy(false)
    }
  }

  return (
    <main className="flex h-svh bg-neutral-100">
      <SidebarNav
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed(!collapsed)}
        active={active}
        onSelectActive={setActive}
        alertCount={alertCount}
        logoutBusy={logoutBusy}
        onLogout={() => void handleLogout()}
      />
      <div className="flex min-w-0 flex-1 flex-col p-3">
        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-gray-200 bg-neutral-50 shadow-lg">
          <div className="h-full overflow-auto p-4">
            {dataError ? (
              <p className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {dataError}
              </p>
            ) : null}
            {active === "Dashboard" ? (
              dataLoading ? (
                <p className="text-sm text-muted-foreground">
                  Loading dashboard…
                </p>
              ) : (
                <Dashboard
                  books={bookRows}
                  alerts={alerts}
                  onOpenAlerts={() => setActive("Alerts")}
                />
              )
            ) : active === "Book Manager" ? (
              <>
                <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                  <BookOpenIcon />
                  <h1 className="text-xl font-bold">BOOK MANAGER</h1>
                </div>
                {dataLoading ? (
                  <p className="mt-6 text-sm text-muted-foreground">
                    Loading books…
                  </p>
                ) : null}
                <BookManager
                  books={bookRows}
                  apiBooks={apiBooks}
                  employees={employees}
                  offices={offices}
                  consumptions={consumptions}
                  onReload={reloadData}
                />
              </>
            ) : active === "Stock Manager" ? (
              <>
                <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                  <BoxesIcon />
                  <h1 className="text-xl font-bold">STOCK MANAGER</h1>
                </div>
                {dataLoading ? (
                  <p className="mt-6 text-sm text-muted-foreground">
                    Loading lots…
                  </p>
                ) : (
                  <StockManager lots={lots} onReload={reloadData} />
                )}
              </>
            ) : active === "Master" ? (
              <>
                <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                  <Building2Icon />
                  <h1 className="text-xl font-bold">MASTER</h1>
                </div>
                {dataLoading ? (
                  <p className="mt-6 text-sm text-muted-foreground">
                    Loading offices and employees…
                  </p>
                ) : null}
                <OfficeManagement
                  offices={offices}
                  employees={employees}
                  onReload={reloadData}
                />
              </>
            ) : active === "Alerts" ? (
              <>
                <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                  <BellIcon />
                  <h1 className="text-xl font-bold">ALERTS</h1>
                </div>
                <div className="mt-6">
                  <Alerts />
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  )
}
