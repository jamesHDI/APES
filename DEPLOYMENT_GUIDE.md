# APES Vercel Production Deployment Guide

This guide provides step-by-step instructions for deploying the **APES (Performance Evaluation System)** on **Vercel** with **Supabase** backend integration.

---

## 1. Prerequisites & Required Environment Variables

Before deploying to Vercel, ensure you have your Supabase project credentials ready.

### Environment Variables

Configure the following variables in **Vercel Project Settings → Environment Variables**:

| Variable Name | Description | Example Value |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Supabase Project URL | `https://zeftcszwvptoesoiabpb.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anonymous Public API Key | `eyJhbGciOiJIUzI...` |

> [!IMPORTANT]
> - In Vite applications, environment variables **must** start with `VITE_`.
> - Do **NOT** expose the Supabase `service_role` key in frontend environment variables.

---

## 2. Vercel Project Build Configuration

When creating or configuring your project on Vercel, set the following options:

- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Node.js Version**: `18.x` or `20.x`

---

## 3. Vercel SPA Routing (`vercel.json`)

The project includes a root `vercel.json` file to manage Single-Page Application (SPA) routing rewrites and security headers.

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

> [!NOTE]
> This configuration guarantees that direct link navigation and browser refreshes (e.g. `/evaluations`, `/management`) render `index.html` cleanly without returning 404 errors.

---

## 4. Step-by-Step Deployment Instructions

### Method A: Deploy via Vercel Dashboard & GitHub Integration (Recommended)

1. **Push Code to Repository**: Push all project commits to your Git repository (GitHub / GitLab / Bitbucket).
2. **Import Project into Vercel**:
   - Log into [Vercel Dashboard](https://vercel.com/dashboard).
   - Click **Add New...** → **Project**.
   - Import your repository.
3. **Configure Settings**:
   - Framework Preset: **Vite**
   - Root Directory: `./`
4. **Add Environment Variables**:
   - Expand **Environment Variables**.
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. **Deploy**:
   - Click **Deploy**. Vercel will run `npm run build` and output the production site.

---

### Method B: Deploy via Vercel CLI

```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

---

## 5. Supabase Production Configuration

To ensure seamless authentication, storage, and database access from your Vercel deployment:

1. **Allowed Redirect URLs**:
   - Go to your **Supabase Dashboard** → **Authentication** → **URL Configuration**.
   - Add your Vercel deployment domain (e.g., `https://your-apes-app.vercel.app`) to **Site URL** and **Redirect URLs**.
2. **CORS / API Access**:
   - Supabase automatically permits API access from any origin when using the anon key.
3. **Database Schema & RLS Policies**:
   - Ensure the PostgreSQL database schema in `supabase_schema.sql` is executed.
   - Row Level Security (RLS) is active to safeguard employee evaluations and profile data.

---

## 6. Pre-Flight Verification Checklist

Before releasing to end users, verify:

- [x] **Production Build**: `npm run build` passes with zero TypeScript or Rollup compilation errors.
- [x] **SPA Refreshing**: Navigating directly to subpaths or refreshing the browser returns the active page (no 404s).
- [x] **Authentication**: User login, department head login, and registration modal work cleanly.
- [x] **Department Workflow**: Evaluation forms, dynamic department head routing, and POD review state transitions function properly.
- [x] **Dark Mode & Responsiveness**: Mobile drawer, tablet grid, and dark mode toggling operate smoothly across screen widths.
- [x] **Error Resiliency**: Uncaught runtime errors trigger the `<ErrorBoundary>` recovery UI.
