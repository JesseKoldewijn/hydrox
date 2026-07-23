# Auth

- Unified `users` + `identities` tables.
- Providers: `password` (Nest/argon2) and optional `workos`.
- WorkOS Organization ↔ our Organization (`workosOrganizationId`).
- Directory Sync maps groups → workspace memberships when configured.
- Product features never branch on identity provider.
