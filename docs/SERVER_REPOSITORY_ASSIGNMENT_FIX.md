# Server repository assignment fix

The server edit modal previously displayed `Unassigned` after reopening because the app saved/displayed only the repository name in local state, while the API did not persist `repository_id` during server updates.

This patch changes server repository handling to use the real repository UUID:

- `protected_servers.repository_id` is loaded from Supabase.
- The server form uses a repository select field instead of a free-text input.
- Creating a server sends `repositoryId` to `/api/servers`.
- Updating a server writes `repository_id` to `protected_servers`.
- The API validates that the selected repository belongs to the selected customer before saving.

If a server was created before this patch, edit it once and select the repository again. After saving, reopening the edit form should keep the selected repository.
