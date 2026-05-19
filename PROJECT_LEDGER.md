# 📒 Clipaura: Project Ledger

This is the central log of all development actions, feature updates, and usage guides.

---

## 🗓️ May 17, 2026

### ✅ Completed Actions
1. **Global Rebrand to Clipaura**: Rebranded all frontend pages, layouts, configuration comments, backend Swagger documents, custom ASS subtitle scripts, and video overlay watermarks.
2. **Premium Stealth Logo Deployment**: Deployed a luxury, platinum-outlined dark-stealth monogram logo matching the high-end dark slate user interface.

## 🗓️ May 16, 2026

### ✅ Completed Actions
1.  **Next.js 14 Migration**: Transitioned from a static site to a high-performance App Router architecture.
2.  **Stealth Mode Design**: Implemented a cinematic minimalism UI with bento grids and glassmorphism.
3.  **Modern SaaS Branding**: Globally purged niche terminology (Intelligence/Neural) for standard industry language.
4.  **Professional Dev Flow**: Added a `DEV_MODE` bypass to skip authentication and speed up local testing.
5.  **Viral Engine 2.0**: Upgraded physics-based caption animations and brand-aligned highlighting.
6.  **Supabase Auth Wiring**: Fully connected the frontend to the backend's secure authentication context.

### 🛠️ Current System Status
*   **Backend**: Running in Docker (FastAPI + Celery + Redis).
*   **Database**: SQLite (`opus_pro.db`) tracking users and jobs.
*   **Payments**: Connected to Stripe Test Mode.
*   **Auth**: Connected to Supabase.

---

## 📖 How to Use Everything

### 🚀 Running the Project
Use the new helper script:
```powershell
.\scripts\dev.ps1 run
```

### 💳 Testing Payments
1.  Open the app and log in.
2.  Click the **FREE** tier badge.
3.  Click **Start 7-Day Free Trial**.
4.  Use test card `4242 4242 4242 4242` on the Stripe page.
5.  **Important**: Keep `stripe listen` running in a separate terminal to confirm the payment.

### 🔍 Running Health Checks
Before merging or deploying, run the smoke test:
```powershell
.\scripts\dev.ps1 test
```

### 📜 Viewing Logs
To see real-time backend activity and errors:
```powershell
.\scripts\dev.ps1 logs
```

---

## 📝 Pending Items
- [ ] Enable Google OAuth in Supabase Dashboard (User Action).
- [ ] Add real Price IDs for Production.
- [ ] Implement face-tracking sensitivity settings.
