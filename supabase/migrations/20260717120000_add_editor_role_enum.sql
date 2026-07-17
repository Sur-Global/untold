-- Add 'editor' as a new user_role value.
-- Must live in its own migration/transaction: Postgres won't let a new enum
-- value be referenced by policies/queries in the same transaction it was added in.
ALTER TYPE user_role ADD VALUE 'editor';
