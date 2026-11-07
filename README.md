# IELTS Intensive

React + Vite front end, Vercel serverless API, Neon Postgres database.

## Deploy on Vercel
1. Push this folder to a GitHub repository and import it in Vercel (framework: Vite, defaults are fine).
2. In the Vercel project, open **Storage**, create a **Neon Postgres** database and connect it. This adds `DATABASE_URL`.
3. Under **Settings > Environment Variables** add:
   - `AUTH_SECRET`: a long random string (for example the output of `openssl rand -hex 32`)
   - `TEACHER_CODE`: the first teacher code (it can be changed later inside the app)
4. Redeploy. Tables are created automatically on the first request.
5. Open the site, sign in as Teacher, add students in the Students tab, then build and publish days in Modules.

## Local development
`npm install`, then `npx vercel dev` with the same environment variables (`vercel env pull`). Plain `npm run dev` serves only the front end.

## Notes
- Uploads (.html, .pdf) are limited to 4 MB, the Vercel function body limit.
- Students can only read files that belong to published days.
