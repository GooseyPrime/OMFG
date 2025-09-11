# Deploying OMFG (Oh My Forking Git) to Railway

## 1. Prerequisites

- A [Railway](https://railway.app/) account
- Your GitHub App’s credentials: `APP_ID`, `PRIVATE_KEY`, `WEBHOOK_SECRET`, `CLIENT_ID`, `CLIENT_SECRET`

## 2. Files Needed

- `Dockerfile`
- `Procfile`
- `railway.json`
- Your app code (`app/index.js` and related files)
- `package.json` and `package-lock.json`

## 3. Environment Variables

Set the following in Railway’s dashboard under "Variables":

- `APP_ID` (from GitHub App settings)
- `PRIVATE_KEY` (paste the full key, including `-----BEGIN PRIVATE KEY-----`)
- `WEBHOOK_SECRET`
- `CLIENT_ID`
- `CLIENT_SECRET`
- Any other custom variables your app uses

## 4. Deploy

1. Push all files to your GitHub repository.
2. From Railway’s dashboard, "New Project" > "Deploy from GitHub repo".
3. Set environment variables as above.
4. Deploy. Railway will install dependencies, build, and serve your Probot app automatically.

Your webhook URL for GitHub App settings will be:
```
https://<your-railway-subdomain>.up.railway.app/
```

## 5. Notes

- Expose port 3000 in your app (default for Probot).
- Logs and deployment status are viewable in Railway’s dashboard.
- For custom domains, configure in Railway settings.

---

For issues or advanced configuration, see [Probot docs](https://probot.github.io/docs/) and [Railway docs](https://docs.railway.app/).

## Connection Issues Fix (v1.0.0+)

**Enhanced Startup:** OMFG now includes an enhanced startup script (`startup.js`) that prevents "connection refused" errors by:
- Providing dummy environment variables if GitHub App credentials are missing
- Adding comprehensive startup logging for better debugging
- Ensuring the service responds to HTTP requests even in setup mode
- Binding to `0.0.0.0` to accept connections from Railway's load balancer

If you still see connection issues, check the deployment logs for the enhanced startup messages.