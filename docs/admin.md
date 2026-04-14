# Admin console

The app includes a simple admin console at `/admin` for:

- **User management**: list users, open profile, delete user
- **Card management**: list cards (like marketplace), open card detail, delete by `card_key`
- **Community management**: list posts, open detail, delete post

Admin access is controlled by an environment variable on the **API**.

---

## Enable admin access

In the **root** `.env` (same file the server loads), set:

```
ADMIN_EMAILS=you@example.com,other-admin@example.com
```

Notes:

- The list is **comma / newline / semicolon** separated.
- Emails are matched **case-insensitively**.
- After changing `.env`, restart the API process.

---

## API endpoints (admin)

All admin endpoints require:

- A signed-in session cookie
- The current user email included in `ADMIN_EMAILS`

Endpoints:

- `GET /api/admin/users?page=1&limit=50&q=search`
- `DELETE /api/admin/users/:id`
- `GET /api/admin/cards?page=1&limit=50&sort=recency`
- `DELETE /api/admin/cards/:cardKey` (deletes raw items in the DB for that `card_key`)
- `GET /api/admin/community/articles`
- `DELETE /api/admin/community/articles/:id`

