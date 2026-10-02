# TikTok LIVE Mafia — Production Deployment & Operations Manual

This document provides the complete, authoritative runbook for deploying **TikTok LIVE Mafia** to production on **Vercel** and **Supabase**, configuring the custom domain **`mafia.chewata.com`**, setting up OBS/Streamlabs for the 9:16 vertical broadcast, and executing the pre-launch checklist.

---

## Table of Contents
1. [Production Architecture](#1-production-architecture)
2. [Vercel Deployment Guide](#2-vercel-deployment-guide)
3. [Custom Domain Setup (`mafia.chewata.com`)](#3-custom-domain-setup-mafiachewatacom)
4. [Supabase Production Setup](#4-supabase-production-setup)
5. [OBS & Streamlabs Studio Setup](#5-obs--streamlabs-studio-setup)
6. [Live Show Operational Runbook](#6-live-show-operational-runbook)
7. [Pre-Launch Acceptance Checklist (REQUIREMENTS §27)](#7-pre-launch-acceptance-checklist-requirements-27)
8. [19 Definition of Done Steps Verification](#8-19-definition-of-done-steps-verification)

---

## 1. Production Architecture

```
[TikTok LIVE / OBS Studio (1080x1920)]
         │
         ▼ (Public Browser Source: /live/:gameCode)
┌────────────────────────────────────────────────────────┐
│                        VERCEL                          │
│   Domain: https://mafia.chewata.com                    │
│   Next.js 14 App Router + Edge / Serverless API        │
│   ├── /                                                │
│   ├── /join/:gameCode        (Player Mobile)           │
│   ├── /play/:sessionId       (Player Mobile Interface) │
│   ├── /admin/:gameId         (Moderator Dashboard)     │
│   ├── /producer/:gameId      (Producer Control Panel)  │
│   ├── /live/:gameCode        (9:16 Vertical Overlay)   │
│   └── /api/*                 (Server Game Engine)      │
└──────────────┬───────────────────────────┬─────────────┘
               │                           │
         Postgres REST / Realtime          │ Service Role Auth
               │                           │
┌──────────────▼───────────────────────────▼─────────────┐
│                       SUPABASE                         │
│   - PostgreSQL 15 with RLS Locked Down                 │
│   - Supabase Realtime (WebSockets)                     │
│   - Supabase Auth (Moderator RBAC)                     │
│   - Tables: games, players, player_sessions,           │
│             votes, night_actions, events, clips        │
└────────────────────────────────────────────────────────┘
```

---

## 2. Vercel Deployment Guide

### 2.1 Prerequisites
- A GitHub repository containing the codebase.
- A Vercel team or personal account.
- A Supabase production project (see Section 4).

### 2.2 Import Project to Vercel
1. Log in to [vercel.com](https://vercel.com) and click **"Add New..." > "Project"**.
2. Select the Git repository `TikTok_Games/Mafia`.
3. Choose framework preset: **Next.js** (auto-detected).
4. Root Directory: `./`

### 2.3 Configure Production Environment Variables
In the Vercel project settings under **Environment Variables**, add the following keys for `Production`, `Preview`, and `Development`:

| Variable Name | Description | Example / Default |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | `https://xyzcompany.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Public Anonymous API Key | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Secret Key (Server-only) | `eyJhbGciOi...` |
| `SUPABASE_PROJECT_REF` | Supabase 20-character Project ID | `xyzcompany` |
| `NEXT_PUBLIC_APP_URL` | Canonical Production App URL | `https://mafia.chewata.com` |
| `NEXT_PUBLIC_APP_ENV` | Application Environment | `production` |

> **IMPORTANT**: `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security. Ensure it is **never** prefixed with `NEXT_PUBLIC_` and never imported in any client component (`'use client'`).

### 2.4 Deploy
Click **Deploy**. Vercel will run `npm run build` which invokes Next.js type checking, route compilation, and asset optimization.

---

## 3. Custom Domain Setup (`mafia.chewata.com`)

### 3.1 DNS Configuration
1. In the Vercel Dashboard, navigate to **Settings > Domains**.
2. Enter: `mafia.chewata.com` and click **Add**.
3. In your DNS provider for `chewata.com` (e.g., Cloudflare, Route53, GoDaddy), create a CNAME record:
   - **Type**: `CNAME`
   - **Name / Host**: `mafia`
   - **Target / Value**: `cname.vercel-dns.com`
   - **TTL**: `Auto` or `300 seconds`
   - **Proxy Status** (if Cloudflare): DNS Only (Grey Cloud) recommended during initial SSL verification, or Full (Strict) SSL with HTTP/2 enabled.

### 3.2 SSL Certificate
Vercel automatically provisions and renews a Let's Encrypt Wildcard / Dedicated SSL certificate once DNS propagation finishes.

---

## 4. Supabase Production Setup

### 4.1 Apply Schema & Migrations
1. Open the [Supabase Dashboard](https://supabase.com/dashboard) for your production project.
2. Navigate to the **SQL Editor**.
3. Open [`supabase/migrations/20261002000001_initial_schema.sql`](./supabase/migrations/20261002000001_initial_schema.sql).
4. Run the entire SQL script. This creates:
   - All 8 tables: `moderators`, `games`, `players`, `player_sessions`, `votes`, `night_actions`, `events`, `clips`
   - Indexes on critical query paths (`code`, `game_id`, `status`, `round`, `token_hash`)
   - Row Level Security (RLS) policies on every table
   - The security-definer function `public.is_moderator()`
   - Realtime publication on `games`, `events`, and `clips`

### 4.2 Verify Realtime Configuration
1. Go to **Database > Replication** in Supabase.
2. Confirm the `supabase_realtime` publication includes:
   - `public.games`
   - `public.events`
   - `public.clips`

### 4.3 Create Initial Moderator Account
In the Supabase SQL Editor, run:
```sql
-- Replace 'your-moderator-uuid' with the auth.users ID created via Supabase Auth
INSERT INTO public.moderators (user_id, role, permissions)
VALUES ('your-moderator-uuid', 'ADMIN', '["all"]'::jsonb)
ON CONFLICT (user_id) DO NOTHING;
```

---

## 5. Streaming Software Setup (TikTok LIVE Studio & OBS)

The LIVE Overlay is built specifically for vertical video streaming (9:16 aspect ratio, 1080x1920).

### 5.1 TikTok LIVE Studio Setup (Official TikTok App)
TikTok LIVE Studio supports adding web overlay elements directly or via virtual camera:

#### Method A: Direct "Link" Source (Recommended)
1. Launch **TikTok LIVE Studio** on Windows.
2. At the top of the canvas, ensure layout is set to **Portrait (9:16)** at **1080x1920**.
3. Under **Scenes & Sources**, click **Add Source (+)**.
4. Select **Link** (or **Web Page / Custom URL**).
5. In the settings panel:
   - **URL**: `https://mafia.chewata.com/live/{GAME_CODE}`
   - **Resolution**: `1080 x 1920`
   - **Frame Rate**: `60 FPS`
   - **Audio**: Enable source audio if you want game audio cues routed to the stream.
6. Position the source to fill the entire 9:16 canvas.

#### Method B: OBS Virtual Camera (Alternative)
If your TikTok LIVE Studio version restricts web links or requires third-party plugins:
1. Open OBS Studio with the 1080x1920 browser source running.
2. Click **Start Virtual Camera** in OBS.
3. In TikTok LIVE Studio, click **Add Source (+)** > **Camera** > Select **OBS Virtual Camera**.

### 5.2 OBS Studio & Streamlabs Desktop Setup
1. Open **OBS Studio** or **Streamlabs Desktop**.
2. In your vertical video scene (1080x1920 canvas):
   - Click **Add Source (+)** > **Browser**.
   - Name: `Mafia Live Overlay`.
3. Configure the Browser Source settings:
   - **URL**: `https://mafia.chewata.com/live/{GAME_CODE}` (replace with the active game code)
   - **Width**: `1080`
   - **Height**: `1920`
   - **Custom Frame Rate**: `60`
   - **Control audio via OBS**: Checked (if overlay audio cues are used)
   - **Shutdown source when not visible**: Unchecked (keeps state active when switching scenes)
   - **Refresh browser when scene becomes active**: Unchecked (prevents unnecessary reloads)

### 5.3 TikTok LIVE Interface Safe Zones
The overlay layout is designed to keep critical game information visible through standard TikTok UI overlays:

| Screen Region | TikTok UI Element | Overlay Usage |
|---|---|---|
| **Top 0px – 280px** | Host avatar, viewer count, LIVE goals | Subtle header / Room code |
| **Middle 280px – 1350px** | **UNOBSTRUCTED SAFE ZONE** | **Game phase, countdown timer, role reveals, voting bars** |
| **Right 880px – 1080px** | Like hearts, share buttons, gift animations | Kept clear of text |
| **Bottom 1350px – 1920px**| TikTok live comments stream & gift tray | Background ambiance / Dead player ticker |

---

## 6. Live Show Operational Runbook

### Pre-Show Checklist (T-15 Minutes)
- [ ] Verify health status: `curl https://mafia.chewata.com/api/health` returns `status: "healthy"`.
- [ ] Moderator logs in at `https://mafia.chewata.com`.
- [ ] Moderator creates a new Game Room (generates 6-character room code).
- [ ] Producer opens `https://mafia.chewata.com/producer/:gameId`.
- [ ] OBS Browser Source updated with the active room code.
- [ ] Producer verifies OBS overlay displays `LOBBY` phase and QR code.

### Player Registration & Lobby (T-10 Minutes)
- [ ] Share player link `https://mafia.chewata.com/join/:gameCode` with contestants.
- [ ] Confirm 5–12 players register with display names and seat numbers.
- [ ] Moderator reviews player list on dashboard.

### Game Execution
1. **Assign Roles**: Moderator clicks "ASSIGN ROLES" — Server distributes Mafia, Detective, Doctor, Citizens.
2. **Start Game**: Moderator transitions to **NIGHT 1**.
3. **Night Phase**:
   - Players see private action buttons on phone (`/play/:sessionId`).
   - Moderator monitors submitted actions on Night Action Panel.
   - Moderator clicks "RESOLVE NIGHT".
4. **Day & Discussion**:
   - Overlay reveals night outcome (saved vs eliminated).
   - Moderator starts Discussion Timer (180s default).
5. **Voting**:
   - Moderator opens Voting.
   - Players select targets on mobile.
   - Overlay shows live anonymous vote progress.
   - Moderator closes voting; system resolves ties or executes majority vote.
6. **Elimination & Win Check**:
   - Eliminated player role revealed.
   - Engine automatically tests win conditions (Mafia Parity vs Citizens Extermination).
   - Loops to next Night round or transitions to **GAME_OVER**.

### Emergency Procedures
- **Player Disconnected**: Moderator dashboard marks player `DISCONNECTED` with last-seen timestamp; player re-navigating to `/play/:sessionId` automatically reconnects with zero state loss.
- **Timer Adjustment**: Moderator can click **+30s**, **PAUSE**, or **RESUME** at any time.
- **Manual Override**: If an edge case occurs, moderator can trigger **FORCE TRANSITION** or **ELIMINATE PLAYER**. Every override is logged to the persistent `events` table with the `MODERATOR_OVERRIDE` audit tag.

---

## 7. Pre-Launch Acceptance Checklist (REQUIREMENTS §27)

| Requirement | Category | Verification Method | Status |
|---|---|---|---|
| Moderator can create a game | Game | `POST /api/games` | [x] Verified |
| Players join via link/QR | Game | `/join/:gameCode` | [x] Verified |
| Moderator sees all players | Game | `/admin/:gameId` players table | [x] Verified |
| Roles assigned server-side | Game | `assignRoles()` engine function | [x] Verified |
| Private role visibility | Game | RLS + Session-only channel | [x] Verified |
| Mafia kill submission | Game | `POST /api/games/:id/night-actions` | [x] Verified |
| Detective investigation | Game | `POST /api/games/:id/night-actions` | [x] Verified |
| Doctor protect & cooldown | Game | 3-round cooldown validator | [x] Verified |
| Day discussion transition | Game | FSM transition to `DISCUSSION` | [x] Verified |
| Anonymous & self-vote rules | Game | `resolveVotes()` engine | [x] Verified |
| Automatic vote calculation | Game | Majority tally + tie handling | [x] Verified |
| Player elimination & reveal | Game | State update + reveal overlay | [x] Verified |
| Automatic win condition check | Game | Parity & town win detection | [x] Verified |
| Server-synced countdown timers | Realtime | `phase_ends_at` server timestamp | [x] Verified |
| Reconnection without state loss| Realtime | Token-hash session recovery | [x] Verified |
| 9:16 Vertical Live Overlay | Broadcast | `/live/:gameCode` in OBS | [x] Verified |
| Zero private data on overlay | Security | Overlay channel filter | [x] Verified |
| Clip marker recording | Content | `POST /api/games/:id/clips` | [x] Verified |
| Audit event logging | Compliance| `events` table logging | [x] Verified |

---

## 8. 19 Definition of Done Steps Verification

The V1 platform satisfies all 19 Definition of Done criteria:

1. **Open Dashboard**: Moderator accesses `/admin/:gameId` with session restored.
2. **Create Game**: Server creates room record with unique 6-character room code.
3. **Share Link**: Direct URL and QR code rendered for mobile contestants.
4. **Register 5-12 Players**: System validates seat allocation, rejects duplicates and capacity overflows.
5. **Assign Roles**: Cryptographically randomized role distribution obeying table balancing matrix.
6. **Start Game**: Game transitions from `ROLE_ASSIGNMENT` to `NIGHT (Round 1)`.
7. **Run Night**: Timers broadcast to all clients; mobile inputs displayed to alive special roles.
8. **Resolve Night Actions**: Automatically applies Kill, Protect save, and Investigation feedback.
9. **Run Day Discussion**: Public overlay switches to Day state; discussion timer synchronizes.
10. **Start Voting**: Voting phase unlocked; eligible voters cast mobile ballots.
11. **Calculate Votes**: Tally computed server-side, preventing duplicate or self-voting.
12. **Eliminate Player**: Highest-vote target marked `ELIMINATED` with elimination reason.
13. **Continue Multi-Round**: Loops Night -> Day -> Voting across multiple full cycles.
14. **Determine Winner**: Evaluates Citizen victory (0 Mafia) or Mafia parity (Mafia >= Citizens).
15. **Display Overlay**: 9:16 vertical broadcast displays every phase, timer, and announcement.
16. **Recover Reconnection**: Reconnecting players and moderators resume current state instantly.
17. **Mark Interesting Moments**: Producer / Moderator tags clips with categories and timestamps.
18. **End Game**: Final transition to `GAME_OVER` displays winner banner.
19. **Review Event Timeline**: Comprehensive audit trail viewable on dashboard and producer panel.
