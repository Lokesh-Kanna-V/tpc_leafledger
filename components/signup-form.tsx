"use client"

import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/password-input"
import { ApiError, parseResponse } from "@/lib/api/request"
import { cn } from "@/lib/utils"

type SignupSuccess = {
  ok: true
  employee: { id: number; name: string; role: string }
}

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [name, setName] = useState("")
  const [role, setRole] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }

    setPending(true)
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          role: role.trim(),
          password,
        }),
      })
      const data = await parseResponse<SignupSuccess>(response)
      setSuccess(
        `Account created for ${data.employee.name}. You can sign in if your role is admin.`,
      )
      setPassword("")
      setConfirm("")
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Something went wrong"
      setError(message)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Create an employee account</CardTitle>
          <CardDescription>
            Creates an employee row with a hashed password in the database. Only
            the admin role can sign in to the app after signup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <FieldGroup>
              {error ? (
                <FieldDescription className="text-destructive">
                  {error}
                </FieldDescription>
              ) : null}
              {success ? (
                <FieldDescription className="text-green-700 dark:text-green-400">
                  {success}
                </FieldDescription>
              ) : null}
              <Field>
                <FieldLabel htmlFor="signup-name">Name</FieldLabel>
                <Input
                  id="signup-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Full name"
                  value={name}
                  onChange={(ev) => setName(ev.target.value)}
                  required
                  disabled={pending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="signup-role">Role</FieldLabel>
                <Input
                  id="signup-role"
                  type="text"
                  autoComplete="organization-title"
                  placeholder="e.g. admin, operator"
                  value={role}
                  onChange={(ev) => setRole(ev.target.value)}
                  required
                  disabled={pending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="signup-password">Password</FieldLabel>
                <PasswordInput
                  id="signup-password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  required
                  disabled={pending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="signup-confirm">Confirm password</FieldLabel>
                <PasswordInput
                  id="signup-confirm"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(ev) => setConfirm(ev.target.value)}
                  required
                  disabled={pending}
                />
              </Field>
              <Field>
                <Button type="submit" disabled={pending}>
                  {pending ? "Creating account…" : "Sign up"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 border-t pt-6">
          <p className="text-center text-sm text-muted-foreground">
            Already registered?{" "}
            <Link
              href="/"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Back to login
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
