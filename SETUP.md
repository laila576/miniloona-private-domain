# Miniloona — The Private Domain

The static website and Supabase applicant portal are configured for the project below.

- Supabase project: `qtklshvjjwntfrijzqxf`
- Website files: `index.html`, `styles.css`, `app.js`
- Applicant authentication and application records use Supabase Auth and Postgres Row Level Security.
- The browser uses only the Supabase publishable key. Never place a service-role/secret key in website files.

## Owner administrator setup

1. Publish the website and open it.
2. Create an account using an email address you control and a strong unique password.
3. Confirm your email if Supabase requests it.
4. In Supabase, open **Authentication → Users**, locate your account and copy its user UUID.
5. In **SQL Editor**, run this statement after replacing the placeholder with that UUID:

```sql
insert into public.admin_users (user_id)
values ('PASTE-YOUR-OWNER-USER-UUID-HERE');
```

6. Sign out of the website and sign in again. Your private application desk should appear.

Only add an account you personally control to `admin_users`. Never add applicant IDs. Do not send your password to anyone.

## Before accepting real applications

Use a second email address you control to test the applicant experience. Confirm that:
- applicants can only view their own application;
- applicants cannot see the administrator dashboard or change review status/notes;
- signed-out visitors cannot read applications;
- the owner can review submissions and set all six statuses;
- applicants can update their own application only when more information is requested.

Delete test accounts and test application data before launch. The deployed database has already been configured and its security/performance checks reported no lints at the time of setup. Do not rerun an old schema file over the live database.

## Privacy and consent

This website is an application workflow, not a booking or consent system. Pre-approval is not a booking, final approval or consent to a session. Consent must be freely negotiated separately and may be withdrawn at any time.

Publish a privacy notice before collecting personal information. Explain what is collected, why, retention/deletion, who can access it and how applicants can contact you. Keep questions minimal and non-graphic. Do not request explicit sexual descriptions, government ID images, payment card details, passwords or other unnecessary sensitive information through this form. An age checkbox is an attestation, not proof of age; arrange any required age/identity verification separately through a secure, lawful process.

## Hosting

GitHub Pages can host the static files for free in a public repository. In the repository, open **Settings → Pages**, choose **Deploy from a branch**, select branch `main` and folder `/(root)`, then save. Wait for the Pages deployment to finish before sharing the site URL.
