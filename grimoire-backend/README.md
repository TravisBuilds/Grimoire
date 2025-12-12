# Grimoire Backend

Express backend server for the Grimoire mobile app.

## Railway Deployment

### Prerequisites
- Railway account (sign up at https://railway.app)
- OpenAI API key

### Deployment Steps

1. **Install Railway CLI** (optional, you can also use the web UI):
   ```bash
   npm i -g @railway/cli
   railway login
   ```

2. **Deploy via Railway Dashboard**:
   - Go to https://railway.app
   - Click "New Project"
   - Select "Deploy from GitHub repo" (recommended) or "Empty Project"
   - If using GitHub, connect your repo and select the `grimoire-backend` directory
   - Railway will auto-detect Node.js and run `npm install` and `npm run build`

3. **Set Environment Variables**:
   In Railway dashboard, go to your project → Variables tab and add:
   - `OPENAI_API_KEY` - Your OpenAI API key (required)
   - `PORT` - Railway sets this automatically, but you can override if needed

4. **Deploy**:
   - Railway will automatically build and deploy when you push to your connected branch
   - Or click "Deploy" in the dashboard

5. **Get Your Backend URL**:
   - After deployment, Railway will provide a public URL (e.g., `https://your-app.railway.app`)
   - Update `BACKEND_URL` in `Grimoire/src/lib/config.ts` to use this URL

### Local Development

```bash
npm install
npm run dev
```

The server will run on `http://localhost:4000` (or the PORT env var).

### Environment Variables

- `OPENAI_API_KEY` (required) - Your OpenAI API key
- `PORT` (optional) - Server port, defaults to 4000

