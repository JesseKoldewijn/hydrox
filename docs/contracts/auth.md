# Auth

- Provider: `password` (Nest / argon2) only.
- Sessions: opaque token (cookie + `Authorization: Bearer`).
- Register creates user + default organization + workspace.

No WorkOS (or other IdP) in the default stack.
