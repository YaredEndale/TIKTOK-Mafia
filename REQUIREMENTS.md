# TikTok LIVE Mafia — Requirements Document
**Version:** V1  
**Product Type:** Real-time multiplayer social deduction game  
**Primary Game:** Mafia / Werewolf  
**Distribution:** TikTok LIVE  
**Target Players:** 5–12 active players  
**Target Audience:** Unlimited spectators  
**Platform:** Mobile Web + Desktop Web  

---

## 1. Product Vision

TikTok LIVE Mafia is an interactive live game-show system that allows a host/moderator to run a Mafia/Werewolf game for an audience watching on TikTok LIVE.

The system is separated into four layers:

| Layer | Role |
|---|---|
| **TikTok LIVE** | Broadcast/entertainment — viewers watch the show |
| **Moderator Dashboard** | Control room — moderator runs game phases, timers, and events |
| **Game Engine (Backend)** | Source of truth — manages all state, rules, logic, and win conditions |
| **Player Web Interface** | Private mobile layer — players act, vote, and receive instructions |

> The moderator handles storytelling, pacing, and entertainment. The software handles all rules.

---

## 2. V1 Objectives

1. Run a complete Mafia game with 5–12 players.
2. Allow players to participate without cameras.
3. Allow players to use phones for private actions.
4. Allow a moderator to control the complete game.
5. Display game state on a vertical LIVE overlay (9:16).
6. Synchronize moderator, players, and overlay in real time.
7. Automatically enforce game rules.
8. Record a complete event timeline.
9. Allow the producer/moderator to mark interesting moments for clipping.
10. Make TikTok integration replaceable rather than architecturally mandatory.

---

## 3. V1 Non-Goals

The following are explicitly **out of scope** for V1:

- TikTok LIVE API dependency
- TikTok chat automation
- TikTok Mini Game
- Player video feeds
- Player voice chat
- Telegram / Discord integration
- AI Game Master
- Automatic video clipping
- Automatic TikTok comment voting
- Complex user accounts / social profiles
- Monetization / in-game purchases
- Public matchmaking
- Large-scale automated moderation

---

## 4. User Roles

### 4.1 Spectator
A person watching the TikTok LIVE.
- Watch the broadcast
- See public game information
- React/comment/share through TikTok
- **Does NOT need an account** in the V1 game system

### 4.2 Player
An active game participant.
- Register for a game via link/QR code
- Receive a player identity and private role
- View game instructions
- Perform permitted role actions
- Submit votes
- View public game state
- Receive elimination status
- **Must only access information appropriate to their role**

### 4.3 Moderator
Runs the game.
- Create and configure a game
- Add/remove players
- Assign roles
- Start/control all game phases
- Control timers (start, pause, extend, reset)
- View private role information
- View submitted actions
- Execute/approve game actions
- Start and end voting
- Reveal vote results
- Eliminate players
- End the game
- Mark clip moments
- Use emergency/safety controls

### 4.4 Producer (Optional V1 role)
Focused on the broadcast/content side.
- Mark clip moments
- Add clip categories
- Monitor game timeline
- Trigger overlay announcements
- Monitor game state
- **Cannot alter game rules**

### 4.5 System Administrator
Manages the platform, not individual games.
- Manage users and permissions
- View system logs and analytics
- Manage game configurations
- Configure default game rules

---

## 5. Game Configuration

V1 must support **configurable game rules** rather than hard-coded values.

### Default Configuration (12 players)
| Role | Count |
|---|---|
| Mafia | 3 |
| Detective | 1 |
| Doctor | 1 |
| Citizens | 7 |

### Supported Player Configurations
| Players | Mafia | Detective | Doctor | Citizens |
|---|---|---|---|---|
| 5 | 1 | 1 | 1 | 2 |
| 6 | 2 | 1 | 1 | 2 |
| 7 | 2 | 1 | 1 | 3 |
| 8 | 2 | 1 | 1 | 4 |
| 9 | 2 | 1 | 1 | 5 |
| 10 | 3 | 1 | 1 | 5 |
| 11 | 3 | 1 | 1 | 6 |
| 12 | 3 | 1 | 1 | 7 |

> Exact balancing rules must remain configurable.

---

## 5.5 Finalized Game Rules and Defaults

> These are **locked decisions** for V1. They are the source of truth for game engine implementation.

### Phase Timers
| Phase | Default Duration | Configurable? |
|---|---|---|
| Night | **90 seconds** | Yes (moderator can extend) |
| Discussion | **180 seconds** | Yes (moderator can pause/extend) |
| Voting | **60 seconds** | Yes (moderator can extend) |

### Voting Rules
| Rule | Decision |
|---|---|
| Tie-breaking | **No elimination** — if vote is tied, nobody is eliminated that round |
| Self-voting | **Prohibited** — players cannot vote for themselves |
| Vote locking | Votes are locked immediately after submission |
| Dead player voting | Dead players cannot vote |

### Role Reveal
| Event | Rule |
|---|---|
| Player eliminated | Role is **always** publicly revealed on the overlay |

### Doctor Rules
| Rule | Decision |
|---|---|
| Self-protection | **Allowed**, but only **once every 3 rounds** |
| Target restriction | Cannot protect the same player on consecutive nights *(recommended default)* |

### Mafia Rules
| Rule | Decision |
|---|---|
| Team visibility | Mafia members **can see each other** during the night phase |
| Self-targeting | Mafia cannot target other Mafia members |

### Game Start
| Rule | Decision |
|---|---|
| Minimum players | **5 players** required to start |
| Maximum players | **12 players** |
| Registration | Moderator manually opens/closes registration |

---

## 6. Game Lifecycle (Finite State Machine)

```
LOBBY
   ↓
PLAYER_SELECTION
   ↓
ROLE_ASSIGNMENT
   ↓
NIGHT
   ↓
DAY
   ↓
DISCUSSION
   ↓
VOTING
   ↓
REVEAL
   ↓
ELIMINATION
   ↓
WIN_CHECK
   ↓
NIGHT (next round) / GAME_OVER
```

---

## 7. Feature Requirements

### 7.1 Lobby
- Moderator creates game and generates a unique Game ID
- Generate player join link (e.g., `mafia.chewata.com/join/024`)
- Display QR code for players to scan
- Set player capacity (5-12)
- Open/close registration
- View registered players in real time

### 7.2 Player Registration
- Mobile-first interface
- Required fields: Display name + optional TikTok username + game code
- No password required in V1
- System generates a **secure player session token** upon registration

### 7.3 Role Assignment
- Roles are **randomly assigned** by the system
- Moderator can see **all** roles
- Players see **only their own** role
- Mafia members can see **other Mafia members**
- Detective can privately investigate players
- Doctor can privately select a player to protect
- Citizens receive no special action
- **Role information must never be exposed through the public overlay**

### 7.4 Night Phase
1. Game state changes to NIGHT
2. Timer starts
3. Relevant players are notified
4. Role actions are opened
5. Actions collected and validated
6. Actions resolved by game engine
7. Night outcome determined
8. Events recorded
9. Transition to DAY

**Moderator controls:** Resolve Night, Extend +30s, Skip

### 7.5 Action Resolution (Server-Side)
The **game engine** — not the moderator — calculates the outcome.

Example:
- Mafia targets Player 05
- Doctor protects Player 05
- Result: Player 05 survives

### 7.6 Day Phase
- Overlay displays current day, DISCUSSION phase, and timer
- Moderator controls: Start Discussion, Pause, Extend, End Discussion, Add Announcement

### 7.7 Voting Phase
- Moderator starts voting
- Timer: **60 seconds** (server-authoritative)
- One vote per alive player
- Dead players cannot vote
- **Players cannot vote for themselves**
- Votes are **locked after submission** — no changes allowed
- Moderator sees live vote count in real time
- Public audience sees live vote bars on overlay
- **Tie rule: If the vote ends in a tie, no player is eliminated that round**

### 7.8 Vote Results and Elimination
- Results displayed as bar graph on moderator dashboard
- Moderator triggers the public reveal
- **Role is always publicly revealed on elimination** (shown on overlay)
- If vote is tied: overlay shows "NO ELIMINATION" — round continues to next Night
- Upon elimination:
  - Player marked as DEAD
  - Role revealed publicly on overlay
  - Further game actions prevented
  - Voting rights revoked
  - Elimination timestamp and cause recorded
  - Win condition check triggered automatically

### 7.9 Win Conditions
- **Mafia wins:** Mafia count >= non-Mafia alive count
- **Citizens win:** Mafia count = 0
- Win conditions evaluated **automatically** after every relevant event
- System stops all further actions upon win

### 7.10 Clip Marker System
Moderator/Producer can mark moments during the game with the following categories:

DRAMA, FUNNY, PLOT TWIST, MAFIA MOMENT, DETECTIVE MOMENT, ARGUMENT, ELIMINATION, BIG REVEAL, FINAL MOMENT

Each clip stores: timestamp, game ID, round number, phase.

### 7.11 Clip Timeline
Post-game event timeline with all marked moments and their timestamps. V1 does **not** need to auto-create video clips — only identify the moments.

---

## 8. Moderator Dashboard Requirements

### Layout
- **Header:** Game ID, LIVE indicator, current day, session duration
- **Player Panel:** List of all players with live status (ALIVE/DEAD)
- **Game Controls:** Phase buttons (Start Night, Start Discussion, Start Voting, Close Voting, Reveal, Eliminate, Check Win, End Game)
- **Timer:** Countdown with +30s, Pause, Reset controls
- **Event Log:** Real-time log of game events

### Safety Controls (Required)
- Pause / Resume game
- Undo last moderator action (where safe)
- Skip phase
- Extend timer
- Force phase transition
- Remove player
- Reconnect player
- Restart game
- End game
- Lock voting
- Manually override outcome
- **All overrides must be logged**

### UX Principle
The moderator must be able to control a game **without navigating multiple pages**. Prioritize speed over visual beauty.

---

## 9. LIVE Overlay Requirements

- **Aspect ratio:** 9:16 (vertical, TikTok LIVE native)
- Loaded as browser source in streaming software
- Auto-updates when game server changes state — no manual refresh
- Must display all game phases: Lobby, Night, Discussion, Voting, Elimination, Game Over

### Design Requirements
- Transparent/controlled backgrounds
- Minimal text, large typography
- Animated major events
- Important information in safe area
- Support game branding
- Works without mouse interaction
- High-contrast, dark background with neon accent recommended

---

## 10. Private Player Interface Requirements

- Mobile-first design
- Fast-loading, low-bandwidth friendly
- Large touch targets
- Minimal text
- Clear action confirmation
- No unnecessary navigation
- Role-specific views:
  - **Mafia:** See teammates, choose kill target, Confirm Kill button
  - **Detective:** Choose investigation target, receive private result
  - **Doctor:** Choose player to protect
  - **Citizen:** View game state, vote in day phase

---

## 11. Realtime Synchronization Requirements

- All clients receive the **same authoritative game state** from the server
- Moderator actions flow: Game API -> Game Engine -> Realtime DB -> all clients
- Realtime update target: **< 500ms** under normal conditions
- API response target: **< 300ms** for normal game actions

---

## 12. Timer Requirements

- Timers are **server-authoritative** — do NOT rely on browser timers alone
- Store: `phaseStartedAt`, `phaseEndsAt`, `duration`
- UI calculates remaining time: `remaining = phaseEndsAt - currentServerTime`
- Prevents different clients from displaying different timer values

---

## 13. Authentication and Authorization

| Role | Auth Method |
|---|---|
| Player | Game code + player session token (no password) |
| Moderator | Authenticated account |
| Producer | Authenticated account with producer permissions |
| Admin | Authenticated administrator account |

- RBAC enforced server-side
- Sensitive data must never be sent to unauthorized clients (not just hidden via CSS)

---

## 14. Security Requirements

- HTTPS everywhere
- Secure session tokens
- Server-side authorization
- No role information in public API responses
- No sensitive data in client-side source
- Rate limiting
- Input validation
- Audit logs
- Secure random role assignment
- Secure random player session tokens
- Expiring game sessions
- Moderator authentication
- Protection against duplicate votes
- Protection against replaying old actions

---

## 15. Game Integrity Requirements

| Violation | Rule |
|---|---|
| Duplicate voting | One active player = one valid vote |
| Invalid actions | A Citizen cannot submit a Mafia kill |
| Dead-player actions | Dead players cannot interact with the active game |
| Wrong phase actions | Night actions cannot be submitted during voting |
| Invalid targets | Mafia cannot target Mafia (configurable) |
| Race conditions | Server determines authoritative order |

---

## 16. Reconnection Requirements

### Player Reconnection
1. Authenticate session
2. Identify active game
3. Retrieve current game state
4. Retrieve permitted private state
5. Resume interaction — player must not need to re-register

### Moderator Reconnection
- Game continues on server if browser crashes
- Timer continues
- Players remain connected
- Moderator reconnects and dashboard reconstructs state

---

## 17. Information Visibility

| Viewer | Can See |
|---|---|
| Public / Spectators | Phase, timer, alive/dead players, public vote results, announcements |
| Player | Own role, permitted team info, permitted actions, own voting status |
| Mafia | + Other Mafia players |
| Detective | + Own investigation results |
| Doctor | + Own protection action status |
| Moderator | Everything |
| Producer | Public game state, timeline, clip markers |

**Critical:** The frontend must NOT simply hide sensitive information using CSS. Unauthorized data must **never be sent to the client**.

---

## 18. URL Architecture

| Path | Purpose |
|---|---|
| `/` | Landing page |
| `/join/:gameCode` | Player registration |
| `/play/:sessionId` | Player interface |
| `/live/:gameCode` | Public LIVE overlay |
| `/admin/:gameId` | Moderator dashboard |
| `/producer/:gameId` | Producer interface |
| `/game/:gameId` | Internal game information |

---

## 19. API Requirements

### Games
```
POST   /api/games
GET    /api/games/:id
PATCH  /api/games/:id
POST   /api/games/:id/start
POST   /api/games/:id/end
```

### Players
```
POST   /api/games/:id/players
GET    /api/games/:id/players
PATCH  /api/players/:id
POST   /api/players/:id/remove
```

### Game Actions
```
POST   /api/games/:id/night-actions
POST   /api/games/:id/votes
POST   /api/games/:id/phase/start
POST   /api/games/:id/phase/end
POST   /api/games/:id/eliminate
```

### Events and Clips
```
GET    /api/games/:id/events
POST   /api/games/:id/events
POST   /api/games/:id/clips
GET    /api/games/:id/clips
```

---

## 20. Realtime Channels

| Channel | Subscribers |
|---|---|
| `game:{gameId}` | All connected clients |
| `player:{playerSessionId}` | Individual player (private) |
| `moderator:{gameId}` | Moderator only |
| `overlay:{gameId}` | Public overlay |

Server controls what information is broadcast to each channel.

---

## 21. Event System

Every important game action generates an event:

```
GAME_CREATED, PLAYER_JOINED, PLAYER_REMOVED, ROLES_ASSIGNED,
NIGHT_STARTED, MAFIA_ACTION_SUBMITTED, DETECTIVE_ACTION_SUBMITTED,
DOCTOR_ACTION_SUBMITTED, NIGHT_RESOLVED, DAY_STARTED,
DISCUSSION_STARTED, VOTING_STARTED, VOTE_SUBMITTED, VOTING_CLOSED,
PLAYER_ELIMINATED, ROLE_REVEALED, WIN_CONDITION_REACHED,
GAME_ENDED, CLIP_MARKED
```

Each event contains: `event_id`, `game_id`, `timestamp`, `event_type`, `actor_id`, `target_id`, `metadata`, `visibility`

---

## 22. Database Schema

### games
`id`, `code`, `status`, `phase`, `round`, `configuration`, `created_at`, `started_at`, `ended_at`, `winner`

### players
`id`, `game_id`, `display_name`, `tiktok_username`, `role`, `status`, `joined_at`, `eliminated_at`

### player_sessions
`id`, `player_id`, `token_hash`, `expires_at`, `last_seen`

### votes
`id`, `game_id`, `round`, `voter_id`, `target_id`, `created_at`

### night_actions
`id`, `game_id`, `round`, `actor_id`, `role`, `target_id`, `action`, `created_at`

### events
`id`, `game_id`, `type`, `actor_id`, `target_id`, `metadata`, `timestamp`

### clips
`id`, `game_id`, `timestamp`, `category`, `description`, `created_by`, `created_at`

### moderators
`id`, `user_id`, `permissions`

---

## 23. Analytics Requirements

### Game Analytics
- Games created / started / completed
- Average game duration / round duration
- Player count, drop-off, reconnects
- Number of eliminations, votes, moderator overrides

### Content Analytics
- Clip markers per game
- Clip categories and most common category

### Future TikTok Metrics (when available)
- LIVE viewers (peak, average), comments, shares, likes, new followers, player conversions

---

## 24. Performance Requirements

| Metric | Target |
|---|---|
| Realtime update | < 500ms under normal conditions |
| API response | < 300ms for normal game actions |
| Concurrent games (V1) | 1 game minimum |
| Active players (V1) | 8-12 |
| Passive viewers | Hundreds/thousands via TikTok |

---

## 25. Availability Requirements

- Game server must remain available throughout the broadcast
- Realtime connections must auto-reconnect
- Game state must persist across browser refreshes
- Moderator refresh must not destroy game state
- Player refresh must not destroy player identity

---

## 26. Error Handling Requirements

The system must clearly handle:
- **Player disconnect:** Show moderator last seen timestamp, hold player state
- **Invalid action:** "This action is no longer available."
- **Expired phase:** "TIME IS UP" message
- **Duplicate action:** "Action already submitted."
- **Server connection loss:** "Reconnecting..." with auto-retry

---

## 27. V1 Acceptance Criteria

### Game
- [ ] Moderator can create a game
- [ ] Players can join through a link
- [ ] Moderator can see all players
- [ ] Roles can be assigned
- [ ] Players can privately see their roles
- [ ] Mafia can perform a kill
- [ ] Detective can investigate
- [ ] Doctor can protect
- [ ] Day discussion can start
- [ ] Players can vote
- [ ] Votes are counted automatically
- [ ] Players can be eliminated
- [ ] Win conditions are automatically detected
- [ ] Game can end

### Realtime
- [ ] Moderator actions update players
- [ ] Moderator actions update overlay
- [ ] Timers synchronize across clients
- [ ] Players can reconnect
- [ ] Moderator can reconnect
- [ ] Game state survives browser refresh

### Broadcast
- [ ] Public overlay works in 9:16
- [ ] Overlay updates without refresh
- [ ] Overlay displays all game phases
- [ ] Overlay displays countdowns
- [ ] Overlay displays elimination/reveal states

### Production
- [ ] Moderator can mark clip moments
- [ ] Clip markers have timestamps
- [ ] Event timeline is saved
- [ ] Moderator actions are logged

---

## 28. Definition of Done

V1 is ready for its first real TikTok LIVE when a moderator can:

1. Open the dashboard
2. Create a game
3. Share a player link
4. Register 8-12 players
5. Assign roles
6. Start the game
7. Run Night
8. Resolve Mafia / Detective / Doctor actions
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

**If all 19 steps work reliably — V1 is complete.**
