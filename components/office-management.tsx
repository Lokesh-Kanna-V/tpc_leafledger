"use client"

import { useState } from "react"
import { Building2Icon, Users2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import Employees from "@/components/employees"
import Offices from "@/components/offices"
import type { Employee } from "@/lib/api/employees"
import type { Office } from "@/lib/api/offices"

type OfficeManagementProps = {
  offices: Office[]
  employees: Employee[]
  onReload: () => Promise<void>
}

type SubTab = "offices" | "employees"

const subTabs: { id: SubTab; label: string; icon: React.ElementType }[] = [
  { id: "offices", label: "Offices", icon: Building2Icon },
  { id: "employees", label: "Employees", icon: Users2Icon },
]

export default function OfficeManagement({
  offices,
  employees,
  onReload,
}: OfficeManagementProps) {
  const [activeTab, setActiveTab] = useState<SubTab>("offices")

  return (
    <div className="mt-6 space-y-6">
      <ButtonGroup>
        {subTabs.map((tab) => {
          const Icon = tab.icon
          return (
            <Button
              key={tab.id}
              type="button"
              variant={activeTab === tab.id ? "default" : "outline"}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Button>
          )
        })}
      </ButtonGroup>

      {activeTab === "offices" ? (
        <Offices offices={offices} onReload={onReload} />
      ) : (
        <Employees
          employees={employees}
          offices={offices}
          onReload={onReload}
        />
      )}
    </div>
  )
}
