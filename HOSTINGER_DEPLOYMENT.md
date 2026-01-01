# Afflux - Hostinger Self-Hosting Guide

This guide covers deploying the Afflux platform to Hostinger with a self-hosted database.

## Prerequisites

- Hostinger hosting account (Premium or Business plan recommended)
- Node.js 18+ installed locally
- Git installed
- A Supabase account (free tier available) OR PostgreSQL database

---

## Part 1: Database Setup

### Option A: Use Supabase (Recommended)

1. **Create a new Supabase project** at [supabase.com](https://supabase.com)
2. **Note your credentials** from Project Settings → API:
   - Project URL (e.g., `https://xxxxx.supabase.co`)
   - Anon/Public Key
   - Service Role Key (keep secret!)

3. **Run the database schema** - Go to SQL Editor and run the contents of `database_schema.sql` (included in this repo)

4. **Configure Storage Buckets**:
   - Go to Storage → Create Bucket
   - Create: `kyc-documents` (private), `branding` (public), `videos` (public)

### Option B: Self-Hosted PostgreSQL on Hostinger

1. **Create PostgreSQL database** in Hostinger hPanel
2. **Note credentials**: host, port, database name, username, password
3. **Run schema** using a PostgreSQL client (pgAdmin, DBeaver, etc.)
4. **Note**: You'll need to implement file storage separately (e.g., local storage or S3)

---

## Part 2: Environment Configuration

Create a `.env` file in your project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id

# For Edge Functions (server-side)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Part 3: Build the Frontend

```bash
# 1. Clone your repository
git clone https://github.com/your-username/afflux.git
cd afflux

# 2. Install dependencies
npm install

# 3. Create .env file with your credentials (see Part 2)

# 4. Build for production
npm run build

# 5. The `dist` folder contains your production files
```

---

## Part 4: Deploy to Hostinger

### Method 1: File Manager Upload

1. Log into Hostinger hPanel
2. Go to **Files** → **File Manager**
3. Navigate to `public_html` folder
4. Delete existing files (backup first if needed)
5. Upload all contents from your `dist` folder
6. Create/upload `.htaccess` file (see below)

### Method 2: Git Deployment (Recommended)

1. In hPanel, go to **Advanced** → **Git**
2. Connect your GitHub repository
3. Set deployment branch and auto-deploy settings
4. Configure build commands in Hostinger

### Required .htaccess File

Create `.htaccess` in `public_html`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Handle client-side routing
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Security headers
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
</IfModule>

# Caching for static assets
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>
```

---

## Part 5: Edge Functions Deployment

Edge Functions need to be deployed to Supabase (even with self-hosted frontend):

1. Install Supabase CLI: `npm install -g supabase`
2. Login: `supabase login`
3. Link project: `supabase link --project-ref your-project-id`
4. Deploy functions: `supabase functions deploy`

### Current Edge Functions:
- `ai-support-chat` - AI customer support
- `create-public-order` - Public order creation
- `manage-admin` - Admin management
- `process-auto-payouts` - Automated payouts
- `send-notification-email` - Email notifications

---

## Part 6: Post-Deployment Checklist

- [ ] Update CORS settings in Supabase to allow your Hostinger domain
- [ ] Configure email provider in Supabase Auth settings
- [ ] Set up SSL certificate (usually automatic with Hostinger)
- [ ] Test all authentication flows
- [ ] Verify file uploads work correctly
- [ ] Test order creation and payment flows
- [ ] Set up database backups

---

## Domain Configuration

1. In Hostinger hPanel, go to **Domains**
2. Point your domain to Hostinger nameservers
3. Add your domain in Supabase Dashboard → Authentication → URL Configuration:
   - Site URL: `https://yourdomain.com`
   - Redirect URLs: `https://yourdomain.com/*`

---

## Troubleshooting

### Blank page after deployment
- Check browser console for errors
- Verify `.htaccess` is properly configured
- Ensure all environment variables are set

### API connection errors
- Verify Supabase URL and keys are correct
- Check CORS configuration in Supabase
- Ensure edge functions are deployed

### Authentication not working
- Update Site URL in Supabase Auth settings
- Add redirect URLs for your domain
- Check email provider configuration

---

## Support

For issues specific to:
- **Hostinger**: Contact Hostinger support
- **Supabase**: Check [supabase.com/docs](https://supabase.com/docs)
- **Application**: Review console logs and network requests
