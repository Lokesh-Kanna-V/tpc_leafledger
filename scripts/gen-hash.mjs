#!/usr/bin/env node
import { randomBytes, scryptSync } from "node:crypto"

const KEYLEN = 64
const OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }

const pwd = process.argv[2]
if (!pwd) {
  console.error("Usage: node scripts/gen-hash.mjs <password>")
  process.exit(1)
}

const salt = randomBytes(16)
const hash = scryptSync(pwd, salt, KEYLEN, OPTIONS)
console.log(["scrypt", salt.toString("base64"), hash.toString("base64")].join("$"))
