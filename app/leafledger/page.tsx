"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import {
  LayoutDashboard,
  ChevronLeft,
  LogOut,
  LeafIcon,
  BookOpenIcon,
  Building2Icon,
  BellIcon,
  BoxesIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

import BookManager from "@/components/book-manager"
import Dashboard from "@/components/dashboard"
import OfficeManagement from "@/components/office-management"
import StockManager from "@/components/stock-manager"
import Alerts from "@/components/alerts"
import { getBooks } from "@/lib/api/books"
import { getConsumptions } from "@/lib/api/consumption"
import { getEmployees } from "@/lib/api/employees"
import { getOffices } from "@/lib/api/offices"
import { getLots } from "@/lib/api/lots"
import { getOverdueAlerts, type AccountingOverdueAlert } from "@/lib/api/alerts"
import type { Book } from "@/lib/api/books"
import type { Consumption } from "@/lib/api/consumption"
import type { Employee } from "@/lib/api/employees"
import type { Office } from "@/lib/api/offices"
import type { Lot } from "@/lib/api/lots"
import { rowsFromDatabase } from "@/lib/books"

type NavItem = {
  label: string
  icon: React.ElementType
  badge?: number
  href?: string
  id: number
}

const mainNav = (alertCount: number): NavItem[] => [
  { label: "Dashboard", icon: LayoutDashboard, id: 0 },
  { label: "Book Manager", icon: BookOpenIcon, id: 1 },
  { label: "Stock Manager", icon: BoxesIcon, id: 2 },
  // { label: "Organization", icon: Building2Icon, id: 3 },
  { label: "Master", icon: Building2Icon, id: 3 },
  { label: "Alerts", icon: BellIcon, id: 4, badge: alertCount || undefined },
]

function NavSection({
  label,
  items,
  active,
  collapsed,
  onSelect,
}: {
  label: string
  items: NavItem[]
  active: string
  collapsed: boolean
  onSelect: (label: string) => void
}) {
  return (
    <div className="space-y-0.5">
      {!collapsed && (
        <p className="px-2 pb-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
          {label}
        </p>
      )}
      {items.map((item) => (
        <NavItemRow
          key={item.label}
          item={item}
          active={active === item.label}
          collapsed={collapsed}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

function NavItemRow({
  item,
  active,
  collapsed,
  onSelect,
}: {
  item: NavItem
  active: boolean
  collapsed: boolean
  onSelect: (label: string) => void
}) {
  const Icon = item.icon

  return (
    <button
      onClick={() => onSelect(item.label)}
      title={collapsed ? item.label : undefined}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
        "hover:bg-muted",
        active
          ? "bg-muted font-medium text-foreground"
          : "text-muted-foreground",
        collapsed && "justify-center"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && (
        <>
          <span className="truncate">{item.label}</span>
          {item.badge && (
            <span className="ml-auto rounded-full bg-destructive/10 px-1.5 py-0.5 text-[11px] font-medium text-destructive">
              {item.badge}
            </span>
          )}
        </>
      )}
    </button>
  )
}

export default function Home() {
  const [collapsed, setCollapsed] = useState(false)
  const [active, setActive] = useState("Dashboard")
  const [logoutBusy, setLogoutBusy] = useState(false)

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
        const alerts = await getOverdueAlerts()
        setAlerts(alerts)
        setAlertCount(alerts.length)
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

  const bookRows = useMemo(
    () => rowsFromDatabase(apiBooks, consumptions, employees, offices),
    [apiBooks, consumptions, employees, offices]
  )

  return (
    <main className="flex h-svh bg-neutral-100">
      <aside
        className={cn(
          "flex h-svh flex-col border-r border-border bg-gray-100 transition-all duration-200 ease-in-out",
          collapsed ? "w-14" : "w-60"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-3 py-3">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-7 w-7 min-w-7 items-center justify-center rounded-md bg-primary/10">
              <LeafIcon className="h-4 w-4 text-primary" />
            </div>
            {!collapsed && (
              <span className="truncate text-sm font-medium text-foreground">
                Leaf Ledger
              </span>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted-foreground transition-transform duration-200 hover:bg-muted",
              collapsed && "rotate-180"
            )}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-4 overflow-hidden px-2 py-3">
          <NavSection
            label="Main"
            items={mainNav(alertCount)}
            active={active}
            collapsed={collapsed}
            onSelect={setActive}
          />
        </nav>

        {/* Footer */}
        <div className="border-t border-border px-2 py-2">
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={logoutBusy}
            className={cn(
              "flex w-full cursor-pointer items-center gap-2 overflow-hidden rounded-md px-2 py-2 text-left transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50",
              collapsed && "justify-center"
            )}
          >
            <div className="flex h-7 w-7 min-w-7 items-center justify-center rounded-full bg-green-100 text-xs font-medium text-green-700">
              LL
            </div>
            {!collapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-foreground">
                  Signed in
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {logoutBusy ? "Signing out…" : "Administrator"}
                </p>
              </div>
            )}
            {!collapsed && (
              <LogOut className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </button>
          {!collapsed && (
            <div className="mt-2 flex items-center justify-center gap-1 text-muted-foreground">
              <Image
                src="/logo_lightmode.png"
                alt="Gamma Grid"
                width={12}
                height={12}
                className="h-3 w-3 object-contain"
              />
              <p className="truncate text-[11px]">Powered by Gamma Grid</p>
            </div>
          )}
        </div>
      </aside>
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
