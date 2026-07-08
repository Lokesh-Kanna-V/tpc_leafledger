import { LeafIcon } from "lucide-react"

import { SignupForm } from "@/features/auth"

export default function SignupPage() {
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
          <LeafIcon className="h-4.5 w-4.5 text-primary" />
        </div>
        <span className="text-lg font-medium text-foreground">
          Leaf Ledger
        </span>
      </div>
      <div className="w-full max-w-sm">
        <SignupForm />
      </div>
    </div>
  )
}
