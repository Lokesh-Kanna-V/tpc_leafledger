"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  LayoutDashboard,
  ChevronLeft,
  LogOut,
  LeafIcon,
  BookOpenIcon,
  Users2Icon,
} from "lucide-react"
import { cn } from "@/lib/utils"

import BookManager from "@/components/book-manager"
import Dashboard from "@/components/dashboard"
import Employees from "@/components/employees"
import { getBooks } from "@/lib/api/books"
import { getConsumptions } from "@/lib/api/consumption"
import { getEmployees } from "@/lib/api/employees"
import { getOffices } from "@/lib/api/offices"
import type { Book } from "@/lib/api/books"
import type { Consumption } from "@/lib/api/consumption"
import type { Employee } from "@/lib/api/employees"
import type { Office } from "@/lib/api/offices"
import { rowsFromDatabase } from "@/lib/books"

type NavItem = {
  label: string
  icon: React.ElementType
  badge?: number
  href?: string
  id: number
}

const mainNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, id: 0 },
  { label: "Book Manager", icon: BookOpenIcon, id: 1 },
  { label: "Employees", icon: Users2Icon, id: 2 },
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

  const [apiBooks, setApiBooks] = useState<Book[]>([])
  const [consumptions, setConsumptions] = useState<Consumption[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [offices, setOffices] = useState<Office[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  const reloadData = useCallback(async () => {
    setDataLoading(true)
    try {
      const [b, c, e, o] = await Promise.all([
        getBooks(),
        getConsumptions(),
        getEmployees(),
        getOffices(),
      ])
      setApiBooks(b)
      setConsumptions(c)
      setEmployees(e)
      setOffices(o)
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

  return (
    <main className="flex h-screen bg-neutral-100">
      <aside
        className={cn(
          "flex h-screen flex-col border-r border-border bg-gray-100 transition-all duration-200 ease-in-out",
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
            items={mainNav}
            active={active}
            collapsed={collapsed}
            onSelect={setActive}
          />
        </nav>

        {/* Footer */}
        <div className="border-t border-border px-2 py-2">
          <div
            className={cn(
              "flex cursor-pointer items-center gap-2 overflow-hidden rounded-md px-2 py-2 transition-colors hover:bg-muted",
              collapsed && "justify-center"
            )}
          >
            <div className="flex h-7 w-7 min-w-7 items-center justify-center rounded-full bg-green-100 text-xs font-medium text-green-700">
              LK
            </div>
            {!collapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-foreground">
                  Lokesh
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  lokesh@company.com
                </p>
              </div>
            )}
            {!collapsed && (
              <LogOut className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </div>
        </div>
      </aside>
      <div className="mt-3 mr-3 flex-1 rounded-lg border border-gray-200 bg-neutral-50 p-4 shadow-lg">
        {dataError ? (
          <p className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {dataError}
          </p>
        ) : null}
        {active === "Dashboard" ? (
          dataLoading ? (
            <p className="text-sm text-muted-foreground">Loading dashboard…</p>
          ) : (
            <Dashboard books={bookRows} />
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
            ) : (
              <BookManager
                books={bookRows}
                apiBooks={apiBooks}
                employees={employees}
                offices={offices}
                onReload={reloadData}
              />
            )}
          </>
        ) : active === "Employees" ? (
          <>
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
              <Users2Icon />
              <h1 className="text-xl font-bold">EMPLOYEES</h1>
            </div>
            {dataLoading ? (
              <p className="mt-6 text-sm text-muted-foreground">
                Loading employees…
              </p>
            ) : (
              <Employees employees={employees} onReload={reloadData} />
            )}
          </>
        ) : null}
      </div>
    </main>
  )
}
