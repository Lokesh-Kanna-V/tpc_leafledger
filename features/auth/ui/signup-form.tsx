"use client"

import Link from "next/link"

import { Button } from "@/shared/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/shared/ui/field"
import { Input } from "@/shared/ui/input"
import { cn } from "@/shared/lib/utils"
import { PasswordInput } from "./password-input"
import { useSignupForm } from "../hooks/use-signup-form"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const {
    name,
    setName,
    role,
    setRole,
    password,
    setPassword,
    confirm,
    setConfirm,
    error,
    success,
    pending,
    onSubmit,
  } = useSignupForm()

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
