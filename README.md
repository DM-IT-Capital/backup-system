# Backup System

A comprehensive backup system similar to Veeam, supporting backup, restore, replicate, with UI, on-prem and cloud management, agent installation, and hypervisor support.

## Components

- **Backend**: Node.js Express API with Supabase (PostgreSQL)
- **Frontend**: React Dashboard
- **Agent**: Python-based agent for servers
- **Database**: Supabase PostgreSQL

## Quick Start (Local Development)

1. Clone the repository
2. Set up Supabase:
   - Create a project at https://supabase.com
   - Get your `DATABASE_URL` from Project Settings > Database
3. Set environment variable:
   ```bash
   export DATABASE_URL=your_supabase_connection_string
   ```
4. Install dependencies:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   cd ../database && pip install -r requirements.txt
   ```
5. Initialize database:
   ```bash
   cd database && python init_db.py
   ```
6. Start the services:
   - Backend: `cd backend && npm start`
   - Frontend: `cd frontend && npm start`

## Vercel Deployment

See [VERCEL_DEPLOYMENT.md](docs/VERCEL_DEPLOYMENT.md) for detailed deployment instructions to Vercel + Supabase.

## Features

- Add servers by IP and install agents
- Create backup, restore, replicate jobs
- Manage from dashboard
- Support for ESXi and other hypervisors
- Cloud-ready with Vercel + Supabase stack