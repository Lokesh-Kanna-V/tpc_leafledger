"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { ApiError } from "@/shared/services/api-client"
import { login } from "../services/auth.service"

export function useLoginForm() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      await login({ name: name.trim(), password })
      router.push("/leafledger")
      router.refresh()
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
    password,
    setPassword,
    error,
    pending,
    onSubmit,
  }
}
