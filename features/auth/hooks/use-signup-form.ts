"use client"

import { useState } from "react"

import { ApiError } from "@/shared/services/api-client"
import { signup } from "../services/auth.service"

export function useSignupForm() {
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
      const data = await signup({
        name: name.trim(),
        role: role.trim(),
        password,
      })
      setSuccess(
        `Account created for ${data.employee.name}. You can sign in if your role is admin.`
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

  return {
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
  }
}
