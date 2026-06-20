# Admin settings page and sidebar navigation

Status: completed

## Parent

Parent PRD: `.scratch/cms-settings-definition/PRD.md`

## What to build

Add the admin-facing settings experience. Create a settings edit page that fetches the full state from `GET /api/cms/settings/:name`, renders the form using the existing tab/section/field components, submits the current values via `PUT /api/cms/settings/:name`, and shows loading, error, and success states consistent with the collection edit page. Update the CMS admin layout to fetch the settings list from `GET /api/cms/settings` and append settings links to the sidebar navigation after custom pages.

This slice covers user stories 5 and 15.

## Acceptance criteria

- [x] Settings groups appear in the CMS sidebar after custom page links.
- [x] Navigating to `/admin/settings/:name` loads the settings edit page.
- [x] The page renders form tabs/sections and fields using the existing form components.
- [x] Saving the form persists values and refreshes the displayed data.
- [x] Loading, error, and success states are handled.

## Blocked by

- `.scratch/cms-settings-definition/issues/02-define-register-list-settings.md`
- `.scratch/cms-settings-definition/issues/03-read-update-eav-settings.md`
