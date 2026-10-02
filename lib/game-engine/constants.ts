/**
 * TikTok LIVE Mafia — Game Engine Constants
 * Source of truth for default rules, timers, and role distributions.
 */

export const GAME_DEFAULTS = {
  timers: {
    night: 90,        // seconds (90s finalized)
    discussion: 180,   // seconds (180s finalized)
    voting: 60,        // seconds (60s finalized)
  },
  players: {
    min: 5,            // minimum players to start (5 finalized)
    max: 12,
  },
  voting: {
    allowSelfVote: false,               // players cannot vote for themselves
    tieRule: 'NO_ELIMINATION' as const, // nobody eliminated on tie
    lockOnSubmit: true,                 // votes are final once cast
  },
  roles: {
    revealOnElimination: true,          // always reveal role on elimination
    mafiaCanSeeTeam: true,              // mafia can see other mafia members
    doctorSelfProtect: true,            // doctor can protect themselves
    doctorSelfProtectCooldown: 3,       // once every 3 rounds
    mafiaCanTargetMafia: false,         // mafia cannot target fellow mafia
  },
} as const;

export type GameDefaults = typeof GAME_DEFAULTS;

export const ROLE_DISTRIBUTIONS: Record<
  number,
  { mafia: number; detective: number; doctor: number; citizen: number }
> = {
  5:  { mafia: 1, detective: 1, doctor: 1, citizen: 2 },
  6:  { mafia: 2, detective: 1, doctor: 1, citizen: 2 },
  7:  { mafia: 2, detective: 1, doctor: 1, citizen: 3 },
  8:  { mafia: 2, detective: 1, doctor: 1, citizen: 4 },
  9:  { mafia: 2, detective: 1, doctor: 1, citizen: 5 },
  10: { mafia: 3, detective: 1, doctor: 1, citizen: 5 },
  11: { mafia: 3, detective: 1, doctor: 1, citizen: 6 },
  12: { mafia: 3, detective: 1, doctor: 1, citizen: 7 },
};

export const CLIP_CATEGORIES = [
  'BLUFF',
  'ACCUSATION',
  'BETRAYAL',
  'ELIMINATION',
  'SAVE',
  'PLOT_TWIST',
  'FUNNY',
  'OTHER',
] as const;

export type ClipCategory = (typeof CLIP_CATEGORIES)[number];
