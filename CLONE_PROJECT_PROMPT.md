# Complete Prompt to Rebuild Afflux Platform

Copy and paste the entire prompt below into a new Lovable project to rebuild this application:

---

## PROMPT START

Build a complete **Afflux Affiliate Marketing Platform** - a comprehensive e-commerce affiliate system where users can create their own storefronts, sell products, and earn commissions. This is a full-stack application with admin and user dashboards.

### Tech Stack
- React 18 with TypeScript
- Vite build system
- Tailwind CSS with custom design system
- Shadcn/UI components
- Supabase for backend (database, auth, storage, edge functions)
- React Query for data fetching
- React Router for navigation
- Zod for validation
- Recharts for analytics charts

---

## DESIGN SYSTEM

### Theme & Colors
Use a professional Navy/Slate theme with Amber accents:
- **Primary**: Deep navy (#1e293b - HSL 222 47% 11%)
- **Accent**: Warm amber (#f59e0b - HSL 38 92% 50%)
- **Background**: Light slate (#f8fafc) / Dark (#0f172a)
- **Font**: "Plus Jakarta Sans" from Google Fonts

### Design Components
- Glass-morphism cards with backdrop blur
- Gradient text effects for headings
- Status badges with color coding (pending=amber, paid=blue, processing=purple, completed=green, cancelled=red)
- Custom shadows and animations (fade-in, slide-up, scale-in)
- Full dark mode support

---

## DATABASE SCHEMA

### Enums
```sql
-- User roles
CREATE TYPE app_role AS ENUM ('admin', 'user');

-- KYC status
CREATE TYPE kyc_status AS ENUM ('not_submitted', 'submitted', 'approved', 'rejected');

-- Order status with workflow
CREATE TYPE order_status AS ENUM ('pending_payment', 'paid_by_user', 'processing', 'completed', 'cancelled');

-- User levels for commission tiers
CREATE TYPE user_level AS ENUM ('bronze', 'silver', 'gold');

-- User approval status
CREATE TYPE user_status AS ENUM ('pending', 'approved', 'disabled');
```

### Tables

1. **profiles** - User profile data
   - user_id (uuid, FK to auth.users)
   - name, email
   - user_status (enum)
   - user_level (enum: bronze/silver/gold)
   - wallet_balance (numeric)
   - commission_override (numeric, nullable)
   - storefront_name, storefront_slug (unique), storefront_banner
   - is_active, created_at, updated_at

2. **user_roles** - Role-based access control (CRITICAL: separate from profiles)
   - user_id (uuid)
   - role (app_role enum)
   - Unique constraint on (user_id, role)

3. **products** - Master product catalog (admin managed)
   - name, sku (unique), description
   - base_price, stock, category
   - image_url, is_active
   - created_at, updated_at

4. **storefront_products** - User's storefront product listings
   - user_id (uuid)
   - product_id (FK to products)
   - selling_price (user sets their markup)
   - custom_description
   - is_active, created_at, updated_at

5. **orders** - Order management
   - order_number (auto-generated: ORD-XXXXXX)
   - storefront_product_id (FK)
   - affiliate_user_id (the seller)
   - customer_name, customer_email, customer_phone, customer_address
   - quantity, selling_price, base_price
   - status (order_status enum)
   - payment_link, payment_link_clicked_at
   - paid_at, completed_at
   - created_at, updated_at

6. **wallet_transactions** - Commission tracking
   - user_id, order_id (FK)
   - amount, type (commission, payout, adjustment)
   - description, created_at

7. **payout_requests** - Withdrawal requests
   - user_id, amount
   - payment_method, payment_details (jsonb)
   - status (pending, approved, rejected)
   - processed_at, processed_by
   - admin_notes, created_at

8. **kyc_submissions** - Identity verification
   - user_id
   - first_name, last_name, date_of_birth
   - aadhaar_number (12 digits), pan_number (format: ABCDE1234F)
   - aadhaar_front_url, aadhaar_back_url, pan_document_url
   - face_image_url, bank_statement_url
   - status (kyc_status enum)
   - rejection_reason, reviewed_by, reviewed_at

9. **chat_messages** - Support chat system
   - user_id, message, sender_role
   - is_read, created_at

10. **platform_settings** - Dynamic configuration
    - key (unique), value, description
    - Keys: platform_name, platform_logo, commission_rate, min_payout_amount, auto_user_approval, faq_items, promo_video_url, level_commissions

11. **audit_logs** - Admin action tracking
    - action_type, entity_type, entity_id
    - user_id, admin_id
    - old_value, new_value (jsonb)
    - reason, metadata, created_at

### Storage Buckets
- **kyc-documents** (private) - KYC verification files
- **branding** (public) - Platform logos, banners
- **videos** (public) - Promo videos

---

## ROW LEVEL SECURITY (RLS)

Implement comprehensive RLS policies:
- Users can only view/edit their own data
- Admins can view/manage all data
- Public storefront products visible only for approved, active users
- Customer data masking for affiliates (only admins see full details)
- Create a `has_role(user_id, role)` security definer function to check roles without recursion

---

## FEATURES BY SECTION

### 1. PUBLIC PAGES

**Landing Page (/)**
- Hero section with gradient background, animated elements
- Feature showcase (Create Store, Sell Products, Earn Commissions)
- "How it Works" section with step indicators
- FAQ accordion (content from platform_settings)
- Promo video modal
- CTA buttons to sign up/login
- Theme toggle (light/dark mode)

**Authentication (/auth)**
- Tab-based Login/Register forms
- Password strength indicator with real-time validation
- Form validation with Zod
- Auto-confirm email signups (no email verification)
- Error handling with toast notifications
- Remember me functionality

**Public Storefront (/store/:slug)**
- Fetch store by slug using `get_public_storefront_profile` function
- Display store banner, name, products
- Shopping cart functionality (local state)
- Shopify-style checkout form
- Order creation via edge function (no auth required)
- Order confirmation with tracking number

**Order Tracking (/track-order)**
- Search by order number + email
- Visual timeline showing order status progression
- Status details and timestamps
- No authentication required

### 2. USER DASHBOARD (/dashboard/*)

**Layout**
- Collapsible sidebar with navigation
- User profile display in sidebar
- Mobile-responsive hamburger menu

**Dashboard Home (/dashboard)**
- Stats cards: Total Orders, Pending Orders, Completed Orders, Wallet Balance
- Recent orders table
- Quick actions: Add Product, View Storefront
- Commission earnings chart (if approved)
- Status alerts for pending approval/KYC

**Products (/dashboard/products)**
- Grid view of available master products
- Add to storefront with custom price setting
- Manage storefront products (edit price, toggle active)
- Product search and category filtering

**Orders (/dashboard/orders)**
- Filterable orders table (by status)
- Order details dialog
- Customer info (masked for privacy)
- Update payment link functionality
- Status timeline per order

**Storefront Settings (/dashboard/storefront)**
- Edit storefront name and slug
- Upload custom banner image
- Preview storefront
- Copy shareable link

**Payments (/dashboard/payments)**
- Wallet balance display
- Transaction history table
- Request payout form (if wallet > min_payout_amount)
- Payout request history

**KYC Verification (/dashboard/kyc)**
- Multi-step KYC form
- Document uploads with camera capture option
- Face photo capture
- Aadhaar & PAN validation
- Status display (pending, approved, rejected)
- Resubmission for rejected applications

**Support (/dashboard/support)**
- Real-time chat with admin
- AI-powered support chatbot (via edge function)
- Typing indicators
- Message history

**Profile (/dashboard/profile)**
- View/edit personal information
- Change password
- View account status

### 3. ADMIN DASHBOARD (/admin/*)

**Dashboard Home (/admin)**
- Platform-wide stats: Total Users, Total Products, Total Orders, Total Revenue
- Revenue analytics chart (daily/weekly)
- Recent orders overview
- Pending items counters (KYC, Payouts, Orders)

**Products Management (/admin/products)**
- CRUD for master products
- Bulk product import (CSV)
- Image upload for products
- Stock management
- Category management

**Users Management (/admin/users)**
- Users table with search/filter
- Approve/disable users
- Change user level (bronze/silver/gold)
- View user details and activity
- Level change history

**Orders Management (/admin/orders)**
- All orders with full customer details
- Update order status workflow
- Add/update payment links
- Order notes
- Bulk order creation

**Wallet & Transactions (/admin/wallet)**
- All transactions across users
- Add manual credits/debits
- Filter by user, type, date

**Payouts (/admin/payouts)**
- Pending payout requests
- Approve/reject with notes
- Auto-payout configuration
- Payout history

**KYC Management (/admin/kyc)**
- Pending KYC submissions
- View uploaded documents
- Approve/reject with reason
- KYC history

**Chat Support (/admin/chat)**
- View all user conversations
- Reply to users
- Mark as read
- Search users

**Reports (/admin/reports)**
- Export data (CSV/JSON)
- Date range filtering
- Order analytics
- User analytics
- Revenue reports

**Settings (/admin/settings)**
- Platform branding (name, logo)
- Commission rates (global and per-level)
- Minimum payout amount
- FAQ management
- Video settings
- Auto user approval toggle
- Payment gateway settings (Razorpay)
- Auto-payout configuration

---

## EDGE FUNCTIONS

1. **ai-support-chat** (public, no auth)
   - AI-powered customer support chatbot
   - Uses Lovable AI gateway
   - Context about Afflux platform
   - Streaming responses

2. **create-public-order** (public, no auth)
   - Create orders from public storefront
   - Validate storefront product
   - Generate order number
   - Return order details

3. **process-auto-payouts** (public, scheduled)
   - Process approved auto-payouts
   - Check wallet balances
   - Create payout records
   - Update wallet balances

4. **send-notification-email** (authenticated)
   - Email notifications for order updates
   - Admin notifications

5. **manage-admin** (authenticated, admin only)
   - Create first admin user
   - Admin management functions

---

## KEY FUNCTIONS (Database)

1. **handle_new_user()** - Trigger on auth.users insert
   - Create profile with pending/approved status based on settings
   - Assign 'user' role

2. **generate_order_number()** - Trigger on orders insert
   - Generate ORD-XXXXXX format

3. **get_affiliate_orders_masked()** - Security definer function
   - Return orders with masked customer data for affiliates
   - Full data for admins

4. **get_public_storefront_profile(slug)** - Security definer
   - Public access to storefront info

5. **protect_profile_fields()** - Trigger
   - Prevent users from modifying protected fields (wallet, status, etc.)

6. **validate_kyc_submission()** - Trigger
   - Validate Aadhaar (12 digits) and PAN format

7. **get_user_commission_rate(user_id)** - Get commission rate
   - Check override, then level-based, then default

---

## IMPORTANT IMPLEMENTATION NOTES

1. **Security**: 
   - NEVER store roles in profiles table
   - Use separate user_roles table with has_role() function
   - Implement comprehensive RLS policies
   - Mask customer data for affiliates

2. **Commission System**:
   - Bronze: 80% of markup (selling_price - base_price)
   - Silver: 85% of markup
   - Gold: 90% of markup
   - Individual overrides possible

3. **Order Flow**:
   - pending_payment → paid_by_user → processing → completed
   - Affiliate can update payment link
   - Admin can update all statuses
   - Commission credited on completion

4. **KYC Flow**:
   - Required for payouts
   - Document validation (Aadhaar 12 digits, PAN format)
   - Admin review required
   - Can resubmit if rejected

5. **Responsive Design**:
   - Mobile-first approach
   - Collapsible sidebar on mobile
   - Touch-friendly interfaces

---

## PROMPT END

---

## Additional Setup Notes

After the project is created:

1. **First Admin User**: Use the manage-admin edge function to create the first admin:
   ```
   POST /functions/v1/manage-admin
   Body: { "email": "admin@example.com", "password": "securepassword" }
   ```

2. **Platform Settings**: Configure these in Admin > Settings:
   - Platform name and logo
   - Commission rates
   - FAQ items
   - Payment gateway

3. **Storage Buckets**: Create these buckets:
   - kyc-documents (private)
   - branding (public)
   - videos (public)

4. **Secrets Required**:
   - LOVABLE_API_KEY (for AI chat)
