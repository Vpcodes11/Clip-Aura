# Clip Aura — User Flow Documentation

## Table of Contents
1. [Landing Page → Signup](#1-landing-page--signup)
2. [Signup → Onboarding](#2-signup--onboarding)
3. [Dashboard Usage](#3-dashboard-usage)
4. [AI Generation Flow](#4-ai-generation-flow)
5. [Credits Flow](#5-credits-flow)
6. [Subscription Flow](#6-subscription-flow)
7. [Failed Payment Flow](#7-failed-payment-flow)
8. [Refund Flow](#8-refund-flow)
9. [Contact / Support Flow](#9-contact--support-flow)
10. [Error States](#10-error-states)
11. [Mobile Flow](#11-mobile-flow)
12. [Logout / Account Deletion](#12-logout--account-deletion)

---

## 1. Landing Page → Signup

### Entry Points
- Direct URL: `https://clipaura.com`
- Organic search (SEO)
- Social media / referral links
- Pricing page

### Page States
| State | Description |
|---|---|
| **Hero / Default** | Animated hero with waveform, title, subtitle, CTA buttons |
| **Scrolling** | Sections animate in via framer-motion `whileInView` |
| **Demo section** | Embedded video showcase with frame/matte styling |
| **Pricing section** | 4-tier cards (Trial, Pro, Studio, Agency) with feature lists |
| **Waitlist section** | Email input + "Request Access" button → **BROKEN: no onSubmit handler** |
| **Footer** | Navigation links, social links, copyright |

### CTA Flow
1. "Request Access" in nav → scrolls to waitlist section
2. "Start Free Trial" on pricing card → scrolls to waitlist
3. Waitlist form submission → **NOTHING HAPPENS (dead form)**

### UX Gap
- The entire conversion funnel is broken. Users cannot sign up.
- No authentication gate exists on the landing page.
- The waitlist is decorative only.

### State Transitions
```
Landing Page → Click "Request Access" → Scrolls to waitlist section
Landing Page → Click "Start Free Trial" → Scrolls to waitlist section  
Waitlist Form → Submit → Nothing happens (no API call, no redirect)
```

---

## 2. Signup → Onboarding

### Current State: Manual Only
Users must be manually created via Supabase dashboard. There is no self-service signup.

### Intended Flow (Not Implemented)
```
/login → Enter email/password → Supabase auth → Redirect to /dashboard
```

### Actual Flow (Dev Mode Only)
```
/login → DEV_MODE detected → Auto-filled dev credentials → /dashboard
```

### Onboarding (Not Implemented)
- No welcome screen
- No walkthrough
- No "upload your first video" tutorial
- User lands directly on dashboard with empty state ("Upload a video" / "Paste a link" cards)

### UX Gaps
- No signup flow exists
- No onboarding exists
- No email verification flow
- No password reset flow
- No "beta access" request flow
- `is_beta_user` flag has no management UI — all new users default to `False` and are locked out

---

## 3. Dashboard Usage

### Entry Points
- `/dashboard` (after auth)
- `/dashboard/clips`
- `/dashboard/settings` (placeholder)
- `/dashboard/billing` (placeholder)
- `/dashboard/projects` (placeholder)
- Direct URL from browser history

### Page: Dashboard (`/dashboard`)
| State | Description |
|---|---|
| **Loading** | Project skeleton rows (ProjectSkeletonRows) |
| **Empty** | Two CTA cards: "Upload a video" + "Paste a link" |
| **Has projects** | Table of projects with name, status, duration, date, actions |
| **Active job** | WebSocket connection for live progress, progress bar, stage indicator |
| **Error** | Error boundary at `/dashboard/error.tsx` |

### Page: Clips (`/dashboard/clips`)
| State | Description |
|---|---|
| **Loading** | Clip skeleton grid (ClipSkeletonGrid) |
| **Empty (no clips)** | "No clips yet" message + "Create your first clip" CTA |
| **Empty (no search results)** | "No matching clips" message |
| **Has clips** | Grid of video cards with hover-to-play preview |
| **Search active** | Filtered grid based on title search |

### Page: Settings (`/dashboard/settings`)
- Static placeholder: "Available in private beta"

### Page: Billing (`/dashboard/billing`)
- Static placeholder: "Available in private beta"

### Page: Projects (`/dashboard/projects`)
- Static placeholder: "Available in private beta"

### Navigation
| UI Element | Status |
|---|---|
| Sidebar: Projects → `/dashboard` | ✅ Active |
| Sidebar: Clips → `/dashboard/clips` | ✅ Active |
| Sidebar: Settings → `/dashboard/settings` | ✅ Active |
| Sidebar: Billing → `/dashboard/billing` | ❌ MISSING from nav |
| Sidebar: Projects page → `/dashboard/projects` | ❌ MISSING from nav |

### UX Gaps
- No breadcrumb navigation
- No "recent projects" quick-access
- No batch operations on clips
- No sort/filter beyond title search on clips
- No project rename
- Delete uses `window.confirm()` — inaccessible

---

## 4. AI Generation Flow

### Upload Flow
```
Dashboard → Click "Upload a video" → UploadModal opens
  ├── Tab: "Upload File" → File input with drag-and-drop → Progress bar (XHR) → Submit
  ├── Tab: "Paste Link" → URL input → Submit
  └── Options: "Enable Hook Optimizer" checkbox (dead code — never sent to API)
Submit → POST /api/upload → Returns job_id → WebSocket opens → Dashboard updates
```

### Pipeline Stages (server-side)
```
1. queued → 2. downloading → 3. preflighted → 4. transcibed → 
5. analyzed → 6. aligned → 7. rendering → 8. rendered → 9. complete
```

### User-Visible Progress
- WebSocket at `ws://api/ws/{job_id}?token={jwt}`
- Progress bar with percentage
- Stage label text
- "View Clips" button appears when status = "complete"

### Edit/Regenerate Flow
```
Clip card → Click "Edit" → EditorModal opens
  ├── Edit title (inline editable)
  ├── Edit hook caption (inline editable)
  ├── Edit individual word timestamps (list)
  └── Save → POST /api/clip/edit → Polling for completion → Update UI
```

### UX Gaps
- WebSocket token in query string (security concern)
- No cancel job button during processing
- Polling in EditorModal doesn't clean up if modal closes mid-save
- No estimated time remaining
- No notification when job completes (user must watch progress bar)
- Failed jobs show generic error — no retry suggestion in UI
- No "processing" indicator on clips page while jobs are running

---

## 5. Credits Flow

### Credit System
- Trial: 60 one-time minutes, 14-day expiry, watermarked exports
- Pro: 240 min/month
- Studio: 600 min/month
- Agency: 1500 min/month
- Rollover credits: purchasable $15/60min packs

### Credit Display
- Dashboard header shows: `{remaining} min remaining`
- Calculated as: `max(0, total_minutes_limit - used_minutes) + rollover_credits`

### Credit Consumption
```
Job starts → Initial check: used_minutes < total_minutes_limit OR has rollover_credits
Job completes → spend_usage_minutes(user, minutes_used)
  ├── Plan minutes consumed first
  └── Rollover credits consumed second
```

### UX Gaps
- No per-job minute cost estimate before starting
- No credit usage history/log
- No low-credit warning before job starts
- No "buy more credits" prompt when credits run out
- `used_minutes` never resets on monthly renewal (critical bug)
- No breakdown of plan vs rollover usage

---

## 6. Subscription Flow

### Subscribe Flow
```
Dashboard/Billing → Click "Subscribe" → POST /api/billing/create-checkout-session
  → Stripe Checkout (external) → Enter payment details → Complete
  → Redirect: /dashboard?session_id={CHECKOUT_SESSION_ID}
  → Stripe webhook: checkout.session.completed → activate_subscription()
  → User tier upgraded → total_minutes_limit updated
```

### Cancel Flow
1. **Self-service**: ❌ NOT IMPLEMENTED
2. **Email support**: User emails support@clipaura.com → Manual Stripe Dashboard cancellation
3. **Webhook-triggered**: Stripe sends `customer.subscription.deleted` → `downgrade_subscription()` → tier set to "trial", limit to 60 min

### Downgrade Flow
```
Webhook: customer.subscription.deleted → downgrade_subscription()
  → subscription_tier = "trial"
  → total_minutes_limit = 60
  → used_minutes NOT reset (may exceed new limit)
  → User locked out if used_minutes > 60
```

### Upgrade/Mid-Cycle Change
```
Webhook: customer.subscription.updated (active) → activate_subscription()
  → subscription_tier = new_tier
  → total_minutes_limit = new_tier_minutes
  → used_minutes NOT reset (correct — doesn't give fresh allotment)
```

### UX Gaps
- No billing page (placeholder)
- No self-service cancellation
- No subscription status display
- No billing history
- No payment method management
- No upgrade/downgrade UI
- No trial expiry countdown
- No "subscription ending" warning
- `cancel_at_period_end` not surfaced in UI

---

## 7. Failed Payment Flow

### What Happens (Current)
1. Stripe attempts payment
2. Payment fails
3. Subscription enters `past_due` status
4. Stripe retries up to 4 times over ~2 weeks
5. Eventually Stripe cancels subscription
6. Webhook: `customer.subscription.deleted` → `downgrade_subscription()`

### What's Missing
- No `invoice.payment_failed` webhook handler
- No user notification on payment failure
- No grace period indicator in UI
- No "update payment method" CTA
- No dunning email integration
- No partial service restriction during `past_due`

---

## 8. Refund Flow

### Per Refund Policy (`/refund-policy`)
- Subscription: 7-day refund for annual plans, pro-rated for monthly
- Credit packs: non-refundable if minutes consumed, refundable if unused
- "Minutes consumed by failed jobs are automatically credited back" — **NOT IMPLEMENTED**
- Refunds issued within 5-10 business days in USD

### Actual Implementation
- No refund endpoint
- No credit-back mechanism for failed jobs
- Session rollback in `handle_job_error` provides PASSIVE protection only
- Must be handled manually via Stripe Dashboard

---

## 9. Contact / Support Flow

### Contact Page (`/contact`)
- Email: support@clipaura.com (display only)
- Twitter/X: @ClipAura (display only)
- Contact form: Name, Email, Message → **alert() only, data discarded**
- FAQ section: 4 static Q&A items

### UX Gaps
- Contact form is non-functional
- No ticket system
- No in-app chat/intercom
- No support documentation/knowledge base

---

## 10. Error States

### Global Error Boundary
- `frontend/app/error.tsx` — Root-level Next.js error boundary
- `frontend/app/dashboard/error.tsx` — Dashboard error boundary
- `frontend/components/ErrorBoundary.tsx` — Class-based React error boundary wrapping dashboard layout

### Missing Error Boundaries
- `/login`, `/demo`, `/pricing`, `/contact`, `/terms`, `/privacy-policy`, `/refund-policy`
- `/dashboard/clips`, `/dashboard/settings`, `/dashboard/billing`, `/dashboard/projects`

### API Error Handling
| Scenario | Current Behavior |
|---|---|
| Network error | Falls back silently |
| 401 Unauthorized | `useAuth` redirects to `/` (with flash of dashboard) |
| 403 Beta locked | JSON response, no user-facing handling |
| 429 Rate limited | JSON response, no retry-after UI |
| 5xx Server error | Generic error displayed |
| WebSocket disconnect | No reconnection logic |
| AI generation fails | Job marked "error", error message shown |
| Upload fails mid-way | XHR error state, no resume support |

### UX Gaps
- No toast/notification system
- No retry buttons on failed API calls
- No graceful degradation when Redis is down
- No offline detection

---

## 11. Mobile Flow

### Current State
- Landing page: responsive at most breakpoints
- Nav: **No hamburger menu** — Features, Showcase, Pricing links invisible below `sm` breakpoint
- Dashboard: **No responsive sidebar** — sidebar and content stack awkwardly
- Clips page: Cards reflow to single column ✅
- Upload modal: Full-screen on mobile ✅
- EditorModal: Works on mobile but complex word-editing UI is cramped
- Video player: Hover-to-play doesn't work on touch devices (relies on `onClick` fallback)

### UX Gaps
- No mobile navigation menu
- Dashboard not optimized for small screens
- Touch targets may be too small on clip cards
- Keyboard navigation untested

---

## 12. Logout / Account Deletion

### Logout Flow
```
Any dashboard page → Click user avatar/name → No logout button exists
```
**There is no logout button in the dashboard UI.**

In `AuthContext.tsx`: `signOut` function exists and calls `supabase.auth.signOut()` but is never wired to a UI element.

### Account Deletion
- No account deletion flow
- No data export flow
- No GDPR data request handling
- No account deactivation

---

## Summary of Broken UX Flows

| Flow | Status | Impact |
|---|---|---|
| Signup / Waitlist | **BROKEN** | Nobody can sign up |
| Contact form | **BROKEN** | All contact messages lost |
| Billing/Settings/Projects pages | **PLACEHOLDER** | Dead-end experiences |
| Logout | **MISSING** | Users can't log out |
| Self-service cancellation | **MISSING** | Chargeback risk |
| Mobile navigation | **MISSING** | Unusable on phones |
| Onboarding | **MISSING** | Zero guidance for new users |
| Error recovery | **PARTIAL** | No retry prompts or suggestions |
