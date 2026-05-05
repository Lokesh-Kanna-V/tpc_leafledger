-- Stores scrypt password hashes for employee login (plain column name: password).
-- Add this column if it does not exist yet:

ALTER TABLE employee ADD COLUMN IF NOT EXISTS password TEXT;

-- Optional: prevent duplicate signup names (signup API returns 409 on conflict).
-- CREATE UNIQUE INDEX employee_name_lower_idx ON employee (LOWER(TRIM(name)));
