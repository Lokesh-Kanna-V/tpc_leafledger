"use client"

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

import { Button } from "@/shared/ui/button"
import { cn } from "@/shared/lib/utils"

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

type SidebarNavProps = {
  collapsed: boolean
  onToggleCollapsed: () => void
  active: string
  onSelectActive: (label: string) => void
  alertCount: number
  logoutBusy: boolean
  onLogout: () => void
}

export function SidebarNav({
  collapsed,
  onToggleCollapsed,
  active,
  onSelectActive,
  alertCount,
  logoutBusy,
  onLogout,
}: SidebarNavProps) {
  return (
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
          onClick={onToggleCollapsed}
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
          onSelect={onSelectActive}
        />
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-2 py-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onLogout}
          loading={logoutBusy}
          className={cn(
            "flex h-auto w-full items-center justify-start gap-2 overflow-hidden rounded-md px-2 py-2 text-left font-normal",
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
        </Button>
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
  )
}
