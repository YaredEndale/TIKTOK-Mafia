# TikTok LIVE Mafia — Implementation Plan
**Version:** V1  
**Stack:** Next.js + Supabase  
**Domain:** mafia.chewata.com  

> Before building anything, read [REQUIREMENTS.md](./REQUIREMENTS.md) and this file in full.

---

## Critical Design Decision

**Do NOT build the system around TikTok.**

Build in this order:
```
Game Engine → Realtime Web Interfaces → Broadcast Overlay → TikTok (later)
```

The overlay is simply a web page. It gets captured by streaming software (OBS/Streamlabs) and pushed to TikTok LIVE. No TikTok API needed for V1.

Game logic must **never** live in the frontend. All rules, validation, and state live on the server.

---

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript | Player app, moderator dashboard, overlay, producer |
| Backend / DB | Supabase (PostgreSQL + RLS) | Auth, Realtime, Edge Functions, Storage |
| Realtime | Supabase Realtime | WebSocket-based pub/sub for game state sync |
| Auth | Supabase Auth | Moderator/Producer accounts; custom token sessions for players |
| Hosting | Vercel (frontend) | Easy deployment, edge network |
| Domain | mafia.chewata.com | Custom domain on Vercel |
| Package Manager | pnpm | Faster installs, deterministic lockfile |
| Node.js | v20 LTS | Long-term support, stable |
| Code Style | ESLint + Prettier | Consistent formatting from day one |
| Commits | Conventional Commits | `feat:`, `fix:`, `chore:` prefixes |
| Branching | `main` = production, `dev` = active dev | Clean separation |

---

## Pre-Development Setup Checklist

> Complete all items below **before writing any code**.

### Accounts and Services
- [ ] **GitHub** — Create repo (e.g. `tiktok-mafia`)
- [ ] **Supabase** — Create project, save `SUPABASE_URL` and keys
- [ ] **Vercel** — Create account, link to GitHub repo
- [ ] **Domain** — Point `mafia.chewata.com` DNS A/CNAME to Vercel

### Supabase Project Configuration
- [ ] Enable **Email/Password Auth** (for Moderator + Producer)
- [ ] Enable **Supabase Realtime** on the `games`, `players`, `events` tables
- [ ] Enable **Row Level Security (RLS)** on all tables from creation
- [ ] Save `SUPABASE_SERVICE_ROLE_KEY` (server-only, never exposed to client)

### Environment Variables (.env.local)
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...          # safe for client
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...               # server-side only

# App
NEXT_PUBLIC_APP_URL=https://mafia.chewata.com
NEXT_PUBLIC_APP_ENV=development
```

### Auth Model (Confirmed)
| Actor | Auth Method |
|---|---|
| Moderator | Supabase Auth (email + password) |
| Producer | Supabase Auth (email + password + producer role) |
| Player | Custom session token in `player_sessions` table (no Supabase account) |
| Overlay | No auth — fully public, read-only |

### Finalized Game Defaults (Confirmed — Do Not Change Without Updating Docs)
```typescript
export const GAME_DEFAULTS = {
  timers: {
    night:      90,   // seconds
    discussion: 180,  // seconds
    voting:     60,   // seconds
  },
  players: {
    min: 5,
    max: 12,
  },
  voting: {
    allowSelfVote:  false,
    tieRule:        'NO_ELIMINATION',  // nobody eliminated on tie
    lockOnSubmit:   true,
  },
  roles: {
    revealOnElimination: true,         // always reveal role publicly
    mafiaCanSeeTeam:     true,
    doctorSelfProtect:   true,
    doctorSelfProtectCooldown: 3,      // once every 3 rounds
    mafiaCanTargetMafia: false,
  },
}
```
This object must live in `lib/game-engine/constants.ts` and be imported by the game engine — never duplicated in frontend components.

---

## Repository Structure

```
/
├── app/                        # Next.js App Router
│   ├── page.tsx                # Landing page (/)
│   ├── join/[gameCode]/        # Player registration (/join/:gameCode)
│   ├── play/[sessionId]/       # Player interface (/play/:sessionId)
│   ├── live/[gameCode]/        # Public LIVE overlay (/live/:gameCode)
│   ├── admin/[gameId]/         # Moderator dashboard (/admin/:gameId)
│   ├── producer/[gameId]/      # Producer interface (/producer/:gameId)
│   └── api/                    # API routes (game engine logic)
│       ├── games/
│       ├── players/
│       ├── night-actions/
│       ├── votes/
│       ├── phase/
│       ├── events/
│       └── clips/
├── components/
│   ├── overlay/                # LIVE overlay components
│   ├── moderator/              # Moderator dashboard components
│   ├── player/                 # Player interface components
│   └── producer/               # Producer interface components
├── lib/
│   ├── game-engine/            # Core game logic (FSM, rules, resolution)
│   ├── supabase/               # Supabase client setup
│   ├── realtime/               # Realtime channel management
│   └── auth/                   # Auth utilities
├── types/                      # TypeScript types for game state, events, etc.
├── supabase/
│   ├── migrations/             # Database migrations
│   └── functions/              # Edge Functions
└── docs/
    ├── REQUIREMENTS.md
    ├── IMPLEMENTATION_PLAN.md
    └── AGENTS.md
```

---

## Phase Roadmap

---

## PHASE 0 — Architecture and Database Setup

**Goal:** Foundation that everything else will build on.

### 0.1 Project Initialization
- [ ] Initialize Next.js 14 project with TypeScript
- [ ] Connect Supabase project
- [ ] Configure environment variables
- [ ] Set up custom domain on Vercel
- [ ] Configure HTTPS

### 0.2 Database Schema
Create the following tables in Supabase (see REQUIREMENTS.md §22 for full schema):

```sql
-- Core tables
games
players
player_sessions
votes
night_actions
events
clips
moderators
```

Enable Row Level Security (RLS) on all tables.

### 0.3 RLS Policies (Critical Security)
```
games        → Public read of non-sensitive fields; write only for authenticated moderators
players      → Players can only read their own sensitive data (role, etc.)
votes        → Players can only insert their own vote; moderator reads all
night_actions → Actor can insert their own; moderator reads all
events       → Insert via server (Edge Functions); read based on visibility field
clips        → Insert by moderator/producer; read by moderator/producer
```

### 0.4 Supabase Auth Setup
- Configure email/password auth for Moderator and Producer accounts
- Create moderators table with permissions
- Configure Supabase Auth policies

### 0.5 TypeScript Types
Define types for:
```typescript
GameState, Player, PlayerRole, GamePhase, GameStatus,
Vote, NightAction, GameEvent, ClipMarker,
RealtimeChannel, ModeratorCommand
```

**Deliverable:** Database running, auth working, schema migrated, types defined.

---

## PHASE 1 — Core Game Engine

**Goal:** All game logic implemented server-side. No frontend yet.

### 1.1 Game Finite State Machine
Implement the FSM with these states:
```
LOBBY → PLAYER_SELECTION → ROLE_ASSIGNMENT →
NIGHT → DAY → DISCUSSION → VOTING → REVEAL → ELIMINATION → WIN_CHECK →
NIGHT (next round) / GAME_OVER
```

Each state transition must be validated server-side.

### 1.2 Role Assignment
- Secure random shuffling (`crypto.getRandomValues` or equivalent)
- Configurable role counts per player count (supports **5-12 players**)
- Store roles in DB with RLS — never exposed to public or other players
- Role configuration loaded from `GAME_DEFAULTS` constants (not hardcoded inline)

### 1.3 Night Action Resolution Engine
```
Inputs: Mafia target, Doctor protection, Detective investigation
Resolution order:
  1. Check if Doctor protection matches Mafia target
  2. If match → player survives
  3. If no match → player eliminated
  4. Detective result stored privately
Output: NightResult { eliminated: PlayerID | null, detected: { target, isMafia } }
```

### 1.4 Vote Counting Engine
- Aggregate votes per target player
- Identify player(s) with most votes
- **Tie rule: NO_ELIMINATION** — if 2+ players are tied for most votes, no elimination occurs that round
- Overlay shows "NO ELIMINATION — VOTE WAS TIED" message
- Return ordered results for moderator display (bar chart)
- Emit `VOTING_CLOSED` event with full result payload

### 1.5 Win Condition Engine
```
After every elimination or phase change, check:
  Mafia win: alive_mafia.count >= alive_non_mafia.count
  Citizens win: alive_mafia.count === 0
```

### 1.6 Game Integrity Validation
Server must reject:
- Duplicate votes (same `voter_id` + `game_id` + `round`)
- **Self-votes** (player voting for themselves — prohibited)
- Actions from dead players
- Actions in wrong phase
- Invalid targets:
  - Mafia cannot target Mafia members
  - Doctor self-protect rejected if used within last 3 rounds
- Actions from players not in the game
- Replayed action tokens (idempotency key per action)

### 1.7 Server-Authoritative Timer
- Store `phase_started_at` and `phase_ends_at` in DB on every phase transition
- Default durations loaded from `GAME_DEFAULTS.timers`:
  - Night: 90s, Discussion: 180s, Voting: 60s
- Client UI calculates: `remaining = phase_ends_at - Date.now()`
- Never trust client-provided timestamps
- Moderator can extend (+30s) or skip — both update `phase_ends_at` in DB and broadcast to all clients

### 1.8 Doctor Self-Protect Cooldown
- Track `doctor_self_protect_used_round` in game state
- On each Doctor action: if target is self, check `currentRound - doctor_self_protect_used_round >= 3`
- If cooldown not elapsed: reject with `DOCTOR_SELF_PROTECT_COOLDOWN` error
- If allowed: record `doctor_self_protect_used_round = currentRound`

### 1.9 Event Logging
Every game action produces an event record. See REQUIREMENTS.md §21 for full event list.

**Deliverable:** Game engine fully tested via unit tests. Can run a full game via API calls alone.

---

## PHASE 2 — API Layer

**Goal:** RESTful API exposing the game engine to all frontends.

### 2.1 API Route Structure
```
POST   /api/games                        → Create game
GET    /api/games/:id                    → Get game state
PATCH  /api/games/:id                    → Update game config
POST   /api/games/:id/start              → Start game
POST   /api/games/:id/end                → End game

POST   /api/games/:id/players            → Register player
GET    /api/games/:id/players            → List players (moderator only for private data)
PATCH  /api/players/:id                  → Update player
POST   /api/players/:id/remove           → Remove player

POST   /api/games/:id/night-actions      → Submit night action
POST   /api/games/:id/votes              → Submit vote
POST   /api/games/:id/phase/start        → Advance phase
POST   /api/games/:id/phase/end          → End current phase
POST   /api/games/:id/eliminate          → Eliminate player

GET    /api/games/:id/events             → Get event log
POST   /api/games/:id/clips              → Add clip marker
GET    /api/games/:id/clips              → Get clip markers
```

### 2.2 Authorization Middleware
Every endpoint must validate:
- Who is making the request (player token, moderator session, public)
- Whether they are authorized for that action
- Whether the action is valid in the current game state

### 2.3 Rate Limiting
Apply rate limiting per player session and per IP.

**Deliverable:** All API endpoints functional, auth enforced, tested with Postman/Bruno.

---

## PHASE 3 — Realtime Layer

**Goal:** Real-time game state sync across all clients.

### 3.1 Supabase Realtime Channels
Set up channels:
```
game:{gameId}              → Public game state updates
player:{sessionId}         → Private player notifications
moderator:{gameId}         → Moderator-only updates
overlay:{gameId}           → Public overlay state
```

### 3.2 State Broadcast Rules
When game state changes:
- `overlay:{gameId}` receives: phase, timer, alive players, public events (NO roles)
- `game:{gameId}` receives: phase, timer, alive/dead player list (NO roles)
- `player:{sessionId}` receives: role-specific private data, permitted actions
- `moderator:{gameId}` receives: everything (roles, actions, votes, all events)

### 3.3 Reconnection Logic
On reconnect:
1. Validate session token
2. Fetch current game snapshot
3. Subscribe to appropriate channels
4. Resume — no re-registration needed

**Deliverable:** State changes propagate to all clients within 500ms.

---

## PHASE 4 — Player Web Interface

**Goal:** Mobile-first player app for joining and playing the game.

### 4.1 Player Registration Page (`/join/:gameCode`)
- Display name input
- Optional TikTok username
- Game code pre-filled from URL
- Submit → receive session token → redirect to player interface
- Mobile-optimized form with large inputs

### 4.2 Waiting Lobby (`/play/:sessionId`)
- Show player number and display name
- "Waiting for moderator..." state
- Live player count from realtime subscription

### 4.3 Role Reveal Screen
- Animate role reveal
- Show role name clearly
- For Mafia: show teammate names
- For Detective/Doctor: show action instructions
- For Citizen: show game rules

### 4.4 Night Phase Screen
Role-specific action UI:
- **Mafia:** Player selection list + CONFIRM KILL button (only alive, non-Mafia players shown)
- **Detective:** Player selection list + INVESTIGATE button
- **Doctor:** Player selection list + PROTECT button
- **Citizen:** Waiting screen ("Night is falling...")
- Timer countdown from server timestamps

### 4.5 Day / Discussion Screen
- Current day number
- DISCUSSION badge
- Timer
- List of alive players
- "Waiting for voting to start..."

### 4.6 Voting Screen
- List of alive players (cannot vote for self)
- Radio buttons (one vote only)
- SUBMIT VOTE button
- Vote locked confirmation after submission

### 4.7 Eliminated Screen
- Player's role is revealed to them
- "You have been eliminated" message
- Can continue watching public game state as spectator view

### 4.8 Game Over Screen
- Winner announcement
- Their role revealed
- Full player list with roles revealed

**Deliverable:** Player can join a game, receive role, perform all role actions, vote, and see game end.

---

## PHASE 5 — Moderator Dashboard

**Goal:** Full game control panel — all controls on one page.

### 5.1 Dashboard Layout
Single-page layout:
```
┌─────────────────────────────────────────┐
│  HEADER: Game ID | Phase | Day | Timer  │
├───────────────────┬─────────────────────┤
│  PLAYER PANEL     │  GAME CONTROLS      │
│  (live list with  │  (phase buttons)    │
│   roles visible   │                     │
│   to moderator)   │  TIMER CONTROLS     │
├───────────────────┴─────────────────────┤
│  EVENT LOG (scrollable, real-time)      │
└─────────────────────────────────────────┘
```

### 5.2 Player Panel
- Real-time list of all players
- Status: ALIVE / DEAD
- Role visible to moderator at all times
- Click player to: Remove, Reconnect, View actions

### 5.3 Game Control Buttons
All phase controls on one screen:
- START NIGHT
- RESOLVE NIGHT (active only when all actions submitted)
- START DISCUSSION
- START VOTING
- CLOSE VOTING
- REVEAL RESULT
- ELIMINATE (with player selector)
- CHECK WIN
- END GAME

Buttons are disabled when action is not valid for current phase.

### 5.4 Timer Controls
- Current timer display (server-synced)
- +30 SEC button
- PAUSE / RESUME button
- RESET button

### 5.5 Night Phase Panel (appears during NIGHT)
- Shows action submission status per role:
  - Mafia: [ ] Pending / [✓] Submitted
  - Detective: [ ] Pending / [✓] Submitted
  - Doctor: [ ] Pending / [✓] Submitted
- RESOLVE NIGHT button (enabled when all submitted or moderator forces)
- Shows night result after resolution

### 5.6 Voting Panel (appears during VOTING)
- Live vote count per player (bar chart)
- Player names and vote tallies
- CLOSE VOTING button

### 5.7 Safety Controls
Always accessible:
- PAUSE GAME / RESUME GAME
- SKIP PHASE
- EXTEND TIMER
- FORCE TRANSITION
- All overrides logged automatically

### 5.8 Clip Marker Panel
- Quick-access category buttons
- MARK CLIP button
- Recent clips list with timestamps

**Deliverable:** Moderator can run a full game without leaving the dashboard.

---

## PHASE 6 — LIVE Overlay

**Goal:** 9:16 vertical web page for streaming software browser source.

### 6.1 Overlay URL
```
/live/:gameCode
```
Loaded in OBS/Streamlabs as a browser source at 1080x1920 (9:16).

### 6.2 Overlay States
Each game phase has a distinct overlay layout:

**Lobby:**
- Game title + Game number
- Player count (X / 12)
- JOIN NOW + QR code or join URL

**Night:**
- NIGHT [N] heading
- Moon emoji / night animation
- Countdown timer (large)

**Discussion:**
- DAY [N] heading
- DISCUSSION
- "WHO IS THE MAFIA?" prompt
- Countdown timer

**Voting:**
- VOTE heading
- "WHO SHOULD LEAVE?"
- Live vote bars (updates in real time)
- Player numbers + bar chart

**Elimination:**
- ELIMINATED heading
- Player name/number
- Skull emoji + animation
- Role revealed (if configured)

**Game Over:**
- GAME OVER
- MAFIA WINS / CITIZENS WIN
- Role reveals

### 6.3 Visual Design Requirements
- Dark background (#0a0a0a or similar)
- High-contrast white/neon text
- Large countdown font (min 80px)
- Smooth animated transitions between states
- No mouse interaction required
- All content in safe area (avoid edges)
- Support for game logo/branding

### 6.4 Overlay Security
- Overlay channel receives ZERO private data
- No roles, no vote breakdown (only if moderator reveals)
- Overlay is fully public — treat as a TikTok viewer could see the source

**Deliverable:** Overlay works as a browser source, auto-updates on all game state changes.

---

## PHASE 7 — Producer Interface

**Goal:** Lightweight broadcast control panel separate from moderator.

### 7.1 Producer Layout
```
/producer/:gameId
```

Controls:
- ⭐ MARK CLIP (with category selector)
- 📢 ANNOUNCEMENT (trigger text overlay on game overlay)
- ⏱ VIEW TIMER
- 🎬 CLIP TIMELINE (list of marked moments)
- Public game state monitor (read-only)

### 7.2 Permissions
- Cannot change game rules
- Cannot eliminate players
- Cannot advance phases
- Can mark clips and trigger overlay announcements

**Deliverable:** Producer can operate independently without risking game integrity.

---

## PHASE 8 — Testing

**Goal:** Validate the system works reliably before going LIVE.

### 8.1 Unit Tests
Test game engine in isolation:
- [ ] Role assignment (correct counts, randomness)
- [ ] Night action resolution (all combinations)
- [ ] Vote counting (ties, clear winners)
- [ ] Win conditions (mafia win, citizen win, edge cases)
- [ ] Phase transitions (valid and invalid)
- [ ] Duplicate vote rejection
- [ ] Dead player action rejection
- [ ] Wrong phase action rejection

### 8.2 Integration Tests
- [ ] Player registers → receives session token
- [ ] Player submits night action → game engine processes
- [ ] Moderator advances phase → all clients update via realtime
- [ ] Vote submitted → live count updates for moderator
- [ ] Reconnecting player → receives correct state
- [ ] Auth checks on all API endpoints

### 8.3 Live Simulation (Required Before Launch)
Run full simulated games:
- [ ] 8-player game (full rounds to completion)
- [ ] 10-player game
- [ ] 12-player game
- [ ] Moderator browser refresh mid-game
- [ ] Player browser refresh mid-game
- [ ] Multiple player disconnects and reconnects
- [ ] Delayed actions (submit after timer expires)
- [ ] Duplicate action attempts
- [ ] Moderator override (extend time, force phase)
- [ ] All 19 Definition of Done steps pass

---

## PHASE 9 — Deployment

### 9.1 Vercel Deployment
- Connect GitHub repo to Vercel
- Set environment variables (Supabase URL, Anon Key, Service Role Key)
- Configure custom domain: mafia.chewata.com
- Enable HTTPS (automatic via Vercel)

### 9.2 Supabase Production Setup
- Enable production-grade connection pooling
- Configure RLS policies reviewed and locked
- Enable Supabase Realtime for production
- Configure auth email templates

### 9.3 Pre-Launch Checklist
- [ ] All acceptance criteria from REQUIREMENTS.md §27 pass
- [ ] All 19 Definition of Done steps verified
- [ ] HTTPS working on all routes
- [ ] Auth tokens expire correctly
- [ ] Overlay working in OBS at 1080x1920
- [ ] Moderator dashboard tested on Chrome/Firefox
- [ ] Player interface tested on iOS Safari and Android Chrome
- [ ] Reconnection tested on both player and moderator

---

## V1 Priority Matrix

### P0 — Must Have (build first)
| Feature | Phase |
|---|---|
| Game engine (FSM, rules, resolution) | Phase 1 |
| API layer | Phase 2 |
| Realtime synchronization | Phase 3 |
| Player web interface | Phase 4 |
| Moderator dashboard | Phase 5 |
| Public overlay (9:16) | Phase 6 |
| Role assignment | Phase 1 |
| Night/day cycle | Phase 1 |
| Voting | Phase 1 |
| Elimination | Phase 1 |
| Win conditions | Phase 1 |
| Timer (server-authoritative) | Phase 1 |
| Event log | Phase 1 |

### P1 — Should Have
| Feature | Phase |
|---|---|
| Clip markers | Phase 7 |
| Producer dashboard | Phase 7 |
| QR code joining | Phase 4 |
| Reconnection | Phase 3 |
| Game history | Phase 9 |
| Analytics | Phase 9 |

### P2 — Later (post V1)
| Feature | Notes |
|---|---|
| TikTok API integration | Separate adapter, do not touch game engine |
| TikTok Mini Game | Requires TikTok review process |
| AI Game Master | Phase 5+ |
| Automatic clipping | Phase 4+ |
| Monetization | Phase 5+ |
| Multiple simultaneous games | Architecturally supported, operationally deferred |
| Social profiles | Phase 5+ |

---

## Architecture Principle (Repeat for Emphasis)

```
MODERATOR BROWSER
      ↓ (command)
GAME API / EDGE FUNCTION
      ↓ (validate)
GAME ENGINE
      ↓ (update)
SUPABASE DATABASE
      ↓ (emit)
REALTIME CHANNELS
      ↓ (push)
┌──────────┬──────────┬──────────┐
│  Player  │Moderator │  Overlay │
│  App     │Dashboard │  Web App │
└──────────┴──────────┴──────────┘
```

**Never put game rules in the frontend. Never trust the client.**

---

## Future: TikTok Adapter (Phase 4+)

The game engine connects to TikTok as a separate adapter — not a core dependency:

```
GAME ENGINE
      │
      ├── Web Adapter (current V1)
      │       └── Player Web App
      │
      └── TikTok Adapter (future)
              └── TikTok Integration
```

This means V1 can launch immediately without waiting for TikTok API approval.

---

## Future: Social Game Platform (Phase 5+)

Mafia is Game #1. The engine becomes a platform:

```
SOCIAL GAME ENGINE
      │
      ├── Mafia
      ├── Werewolf
      ├── Spyfall
      ├── Trivia Battle
      └── Murder Mystery
```

Design decisions in V1 should not prevent this expansion.
