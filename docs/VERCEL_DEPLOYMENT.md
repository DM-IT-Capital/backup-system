# Vercel Deployment Guide

## Prerequisites
- Vercel account (vercel.com)
- Supabase account (supabase.com)
- GitHub account (recommended for easy deployment)

## Database Setup (Supabase)

1. Create a new Supabase project at https://supabase.com
2. Go to Project Settings > Database > Connection Pooling
3. Copy the connection string with pool mode
4. Initialize the database by running the init script locally:
   ```bash
   export DATABASE_URL="your_supabase_connection_string"
   cd database && python init_db.py
   ```

## Backend Deployment

1. Push your code to GitHub
2. Go to https://vercel.com and sign in
3. Click "New Project" > Import Git Repository
4. Select your backup-system repository
5. Configure project settings:
   - Framework Preset: Other
   - Root Directory: `backend`
6. Add Environment Variables:
   - `DATABASE_URL`: Your Supabase connection string
7. Click Deploy

## Frontend Deployment

1. In Vercel dashboard, click "New Project"
2. Import the same GitHub repository
3. Configure project settings:
   - Framework Preset: Create React App
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `build`
4. Add Environment Variables:
   - `REACT_APP_API_URL`: Your backend Vercel URL (e.g., https://backup-system-backend.vercel.app)
5. Click Deploy

## Update Frontend API Configuration

After deploying the backend, update `frontend/src/App.js`:

```javascript
const api = axios.create({ 
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api' 
});
```

## Verification

- Backend: Visit `https://your-backend.vercel.app/api` - should see `{"message":"Backup system API is running"}`
- Frontend: Visit `https://your-frontend.vercel.app` - should load the dashboard
- Test API calls from frontend to backend

## Notes

- Both services can be deployed independently
- Supabase provides automatic backups and scaling
- Vercel provides unlimited deployments and custom domains
