This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
## Notifications Scheduler

This project includes a notification API endpoint at `/api/notifications` and a helper script to trigger it.

### Local trigger

Run the notification script locally:

```bash
npm run notify
```

By default this calls `http://localhost:3000/api/notifications`.

If your app is deployed somewhere else, set the target URL first:

```bash
export NOTIFICATION_API_URL=https://your-app-url.vercel.app/api/notifications
npm run notify
```

### Test notification

For a one-off test message, use:

```bash
NOTIFICATION_ACTION=test NOTIFICATION_API_URL=http://localhost:3000/api/notifications NOTIFICATION_CHAT_ID=5387189328 npm run notify
```

### GitHub Actions scheduler

If you host this repo on GitHub, you can use the included workflow in `.github/workflows/notify.yml` to trigger notifications regularly.

Set the repository secret `NOTIFICATION_API_URL` to your deployed API endpoint, for example:

- `https://your-app-name.vercel.app/api/notifications`

When the workflow runs, it sends a `trigger` request to your notifications endpoint.

## Deploy on Vercel

To run this app in production on Vercel, create a new Vercel project from this repository and add the required environment variables in the Vercel dashboard under `Settings > Environment Variables`.

Required Vercel environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `TELEGRAM_BOT_TOKEN`

If you need server-side role access in your app, also add:

- `SUPABASE_SERVICE_ROLE_KEY`

Use the production deployment URL for GitHub Actions scheduling:

- `NOTIFICATION_API_URL=https://your-app-name.vercel.app/api/notifications`

After deploy, the GitHub Actions workflow will call that URL on schedule.

### Vercel deployment notes

- Keep `TELEGRAM_BOT_TOKEN` secret and do not commit it to the repo.
- If your bot does not send messages, make sure the bot has been started in Telegram and the chat ID is valid.
- You can test the deployed notification endpoint with:

```bash
NOTIFICATION_ACTION=test NOTIFICATION_API_URL=https://your-app-name.vercel.app/api/notifications NOTIFICATION_CHAT_ID=5387189328 npm run notify
```

## Deploy on Vercel

To deploy this app on Vercel, follow these simple steps:

1. Push your repo to GitHub.
2. Open [Vercel](https://vercel.com/new) and connect your GitHub repo.
3. In Vercel project settings, add these environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `TELEGRAM_BOT_TOKEN`
   - (optional) `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy the app.
5. Set the `NOTIFICATION_API_URL` secret in GitHub to your deployed URL, for example:
   - `https://your-app-name.vercel.app/api/notifications`
6. Enable the `notify.yml` workflow or use `npm run notify` locally.

### Vercel deploy checklist

- `TELEGRAM_BOT_TOKEN` is stored only in Vercel secrets, never committed.
- Your Telegram bot must be started in Telegram before messages can arrive.
- Use the deployed app URL for `NOTIFICATION_API_URL`.

You can also test the deployed endpoint with:

```bash
NOTIFICATION_ACTION=test NOTIFICATION_API_URL=https://your-app-name.vercel.app/api/notifications NOTIFICATION_CHAT_ID=5387189328 npm run notify
```

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
