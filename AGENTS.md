# TikTok LIVE Mafia — Agent Instructions

> This file is the entry point for any AI agent, developer, or automated system working on this codebase.
> **Read this file first. Always.**

---

## What This Project Is

This is **TikTok LIVE Mafia** — a real-time multiplayer social deduction game (Mafia/Werewolf) designed to run as an interactive live show on TikTok LIVE.

It is NOT a simple chat bot. It is NOT a TikTok-dependent system. It is a full game platform with:
- A **server-side game engine** (all rules live here)
- A **moderator dashboard** (one-page game control)
- A **player mobile interface** (private role actions, voting)
- A **public LIVE overlay** (9:16 vertical web page for streaming software)

---

## Mandatory: Read These Documents Before Building Anything

You MUST read and understand these two documents before writing any code, creating any file, or making any architectural decision:

### 1. [REQUIREMENTS.md](./REQUIREMENTS.md)
Contains:
- Product vision and V1 objectives
- What is explicitly OUT of scope for V1
- All user roles and their permissions
- Game configuration and role balancing rules
- Complete game lifecycle (FSM states)
- All feature requirements (Lobby through Game Over)
- Security and integrity requirements
- Authentication model
- Database schema
- API contract
- Realtime channel structure
- Performance and availability targets
- V1 Acceptance Criteria (checklist)
- Definition of Done (19 steps)

### 2. [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)
Contains:
- Tech stack decisions and rationale
- Repository structure
- 9-phase build plan with task breakdowns
- P0 / P1 / P2 feature priority matrix
- Architecture diagrams
- Testing requirements (unit, integration, live simulation)
- Deployment checklist
- Future roadmap (TikTok Adapter, social game platform)

---

## Non-Negotiable Rules

These rules apply to every decision made in this codebase. Do not violate them.

### Rule 1: Game Logic Lives on the Server
```
WRONG: Moderator browser calculates win condition
RIGHT: Moderator browser sends command → server validates → server updates state → server broadcasts
```
Never put game rules, role resolution, vote counting, or win condition logic in any frontend component.

### Rule 2: Never Expose Private Data to Unauthorized Clients
- Role information must NEVER appear in public API responses
- The overlay channel must receive ZERO private data
- Do not hide sensitive data with CSS — never send it to the client at all
- Each Supabase RLS policy must enforce this at the database level

### Rule 3: Do Not Make TikTok a Core Dependency
- V1 does not require TikTok API access
- The overlay is just a web page captured by OBS/Streamlabs
- TikTok is a broadcast destination, not a game input channel
- If adding TikTok features, implement as an **adapter** around the game engine — do not modify the engine

### Rule 4: Timers Are Server-Authoritative
- Never use `setTimeout` or `setInterval` as the source of truth for game timers
- Store `phase_started_at` and `phase_ends_at` in the database
- Client UI calculates: `remaining = phase_ends_at - Date.now()`
- This prevents timer drift between clients

### Rule 5: Every Moderator Override Must Be Logged
- If a moderator manually overrides any game state, it must produce a `MODERATOR_OVERRIDE` event in the event log
- This is required for debugging, dispute resolution, and analytics

### Rule 6: Reconnection Must Work
- Browser refresh must not destroy game state for moderator or player
- Reconnecting player must receive their role, current phase, and permitted actions without re-registering
- Moderator reconnect must fully reconstruct the dashboard state from server

### Rule 7: The Player Interface Is Mobile-First
- Players use phones, not computers
- Large touch targets
- Minimal text
- No unnecessary navigation
- Fast load times

---

## V1 Scope Boundaries

### Build in V1
- Game engine (FSM + rules)
- Moderator dashboard
- Player mobile interface
- Public LIVE overlay (9:16)
- Role assignment
- Night / Day cycle
- Voting and elimination
- Win conditions
- Realtime synchronization
- Server-authoritative timers
- Event log
- Clip markers (P1)
- QR code joining (P1)
- Reconnection handling (P1)

### Do NOT Build in V1
- TikTok LIVE API integration
- TikTok chat automation
- TikTok Mini Game
- Player video feeds
- Player voice chat
- Telegram / Discord bots
- AI Game Master
- Automatic video clipping
- Social profiles / user accounts
- Monetization / in-game purchases
- Public matchmaking

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Backend / DB | Supabase (PostgreSQL + RLS) |
| Realtime | Supabase Realtime (WebSockets) |
| Auth | Supabase Auth |
| Game Logic | Next.js API Routes / Supabase Edge Functions |
| Hosting | Vercel |
| Domain | mafia.chewata.com |

---

## URL Map

| URL | Interface |
|---|---|
| `/` | Landing page |
| `/join/:gameCode` | Player registration |
| `/play/:sessionId` | Player game interface |
| `/live/:gameCode` | Public LIVE overlay (9:16) |
| `/admin/:gameId` | Moderator dashboard |
| `/producer/:gameId` | Producer interface |

---

## Game State Machine

```
LOBBY → PLAYER_SELECTION → ROLE_ASSIGNMENT →
NIGHT → DAY → DISCUSSION → VOTING → REVEAL → ELIMINATION → WIN_CHECK →
NIGHT (next round) / GAME_OVER
```

State transitions are validated server-side only.

---

## Information Visibility (Security Summary)

| Viewer | Allowed Data |
|---|---|
| Public / Overlay | Phase, timer, alive/dead list, public announcements — NO roles |
| Player | Own role, permitted actions, own vote status |
| Mafia | + Other Mafia player names |
| Detective | + Own investigation results |
| Moderator | Everything |
| Producer | Public state + timeline + clip markers |

---

## Definition of Done

V1 is complete when a moderator can perform all 19 steps end-to-end without errors:

1. Open the dashboard
2. Create a game
3. Share a player link
4. Register 5–12 players
5. Assign roles
6. Start the game
7. Run Night
8. Resolve Mafia / Detective / Doctor actions automatically
9. Run Day discussion
10. Start voting
11. Automatically calculate votes
12. Eliminate a player
13. Continue through multiple rounds
14. Automatically determine the winner
15. Display every public phase on the LIVE overlay
16. Recover from a browser refresh or temporary connection loss
17. Mark interesting moments
18. End the game
19. Review the event timeline

**All 19 must pass reliably before considering V1 done.**

---

## Questions Before Starting

If the task is unclear, check these documents first:
- Is this a game engine task? → See REQUIREMENTS.md §6-7 + §5.5 (finalized rules), IMPLEMENTATION_PLAN.md Phase 1
- Is this a UI task? → See REQUIREMENTS.md §8-10, IMPLEMENTATION_PLAN.md Phase 4-6
- Is this a security task? → See REQUIREMENTS.md §14-17
- Is this an API task? → See REQUIREMENTS.md §19-20, IMPLEMENTATION_PLAN.md Phase 2
- Is this a database task? → See REQUIREMENTS.md §22, IMPLEMENTATION_PLAN.md Phase 0
- Is this about TikTok? → See REQUIREMENTS.md §3 (Non-Goals), IMPLEMENTATION_PLAN.md Future section

If your task is not covered in either document, stop and ask for clarification before building.
