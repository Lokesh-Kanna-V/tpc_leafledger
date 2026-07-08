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
import { useLoginForm } from "../hooks/use-login-form"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { name, setName, password, setPassword, error, pending, onSubmit } =
    useLoginForm()

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Sign in with your employee name and password. Only accounts with the
            admin role can access the app after login.
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
              <Field>
                <FieldLabel htmlFor="login-name">Name</FieldLabel>
                <Input
                  id="login-name"
                  type="text"
                  autoComplete="username"
                  placeholder="Your name as in Leaf Ledger"
                  value={name}
                  onChange={(ev) => setName(ev.target.value)}
                  required
                  disabled={pending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="login-password">Password</FieldLabel>
                <PasswordInput
                  id="login-password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  required
                  disabled={pending}
                />
              </Field>
              <Field>
                <Button type="submit" disabled={pending}>
                  {pending ? "Signing in…" : "Login"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 border-t pt-6">
          <p className="text-center text-sm text-muted-foreground">
            Need an account?{" "}
            <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
