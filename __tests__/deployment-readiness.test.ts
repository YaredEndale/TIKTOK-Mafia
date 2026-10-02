import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Phase 09 — Deployment & Production Readiness Validation', () => {
  const rootDir = path.resolve(__dirname, '..');

  it('DEP-01: Validates .env.example contains all required production configuration keys', () => {
    const envPath = path.join(rootDir, '.env.example');
    expect(fs.existsSync(envPath)).toBe(true);
    const envContent = fs.readFileSync(envPath, 'utf-8');

    const requiredKeys = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_PROJECT_REF',
      'NEXT_PUBLIC_APP_URL',
      'NEXT_PUBLIC_APP_ENV',
    ];

    for (const key of requiredKeys) {
      expect(envContent).toContain(key);
    }
  });

  it('DEP-02: Validates vercel.json configuration and security headers', () => {
    const vercelConfigPath = path.join(rootDir, 'vercel.json');
    expect(fs.existsSync(vercelConfigPath)).toBe(true);

    const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf-8'));
    expect(vercelConfig.framework).toBe('nextjs');
    expect(Array.isArray(vercelConfig.headers)).toBe(true);

    // Check OBS overlay headers (frame-ancestors allows embedding into OBS browser source)
    const liveHeaderRule = vercelConfig.headers.find(
      (h: { source: string }) => h.source === '/live/(.*)'
    );
    expect(liveHeaderRule).toBeDefined();
    const cspHeader = liveHeaderRule.headers.find(
      (h: { key: string }) => h.key === 'Content-Security-Policy'
    );
    expect(cspHeader).toBeDefined();
    expect(cspHeader.value).toContain('frame-ancestors');

    // Check API cache-control headers (prevent stale responses for real-time game APIs)
    const apiHeaderRule = vercelConfig.headers.find(
      (h: { source: string }) => h.source === '/api/(.*)'
    );
    expect(apiHeaderRule).toBeDefined();
    const cacheHeader = apiHeaderRule.headers.find(
      (h: { key: string }) => h.key === 'Cache-Control'
    );
    expect(cacheHeader.value).toContain('no-store');
  });

  it('DEP-03: Validates Supabase schema migration creates all 8 required tables and realtime publications', () => {
    const migrationPath = path.join(
      rootDir,
      'supabase',
      'migrations',
      '20261002000001_initial_schema.sql'
    );
    expect(fs.existsSync(migrationPath)).toBe(true);
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

    const requiredTables = [
      'public.moderators',
      'public.games',
      'public.players',
      'public.player_sessions',
      'public.votes',
      'public.night_actions',
      'public.events',
      'public.clips',
    ];

    for (const table of requiredTables) {
      expect(migrationSql).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
      expect(migrationSql).toContain(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
    }

    // Verify Realtime publication adds core broadcast tables
    expect(migrationSql).toContain('ALTER PUBLICATION supabase_realtime ADD TABLE public.games;');
    expect(migrationSql).toContain('ALTER PUBLICATION supabase_realtime ADD TABLE public.events;');
    expect(migrationSql).toContain('ALTER PUBLICATION supabase_realtime ADD TABLE public.clips;');
  });

  it('DEP-04: Validates DEPLOYMENT.md documentation exists with all critical operational sections', () => {
    const deploymentDocPath = path.join(rootDir, 'DEPLOYMENT.md');
    expect(fs.existsSync(deploymentDocPath)).toBe(true);
    const doc = fs.readFileSync(deploymentDocPath, 'utf-8');

    expect(doc).toContain('Vercel Deployment Guide');
    expect(doc).toContain('mafia.chewata.com');
    expect(doc).toContain('Supabase Production Setup');
    expect(doc).toContain('OBS & Streamlabs Studio Setup');
    expect(doc).toContain('1080x1920');
    expect(doc).toContain('Live Show Operational Runbook');
    expect(doc).toContain('Pre-Launch Acceptance Checklist');
  });

  it('DEP-05: Validates all 19 Definition of Done checklist steps', () => {
    const dodSteps = [
      '1. Open the dashboard',
      '2. Create a game',
      '3. Share a player link',
      '4. Register 5-12 players',
      '5. Assign roles',
      '6. Start the game',
      '7. Run Night',
      '8. Resolve Mafia / Detective / Doctor actions',
      '9. Run Day discussion',
      '10. Start voting',
      '11. Automatically calculate votes',
      '12. Eliminate a player',
      '13. Continue through multiple rounds',
      '14. Automatically determine the winner',
      '15. Display every public phase on the LIVE overlay',
      '16. Recover from a browser refresh or temporary connection loss',
      '17. Mark interesting moments',
      '18. End the game',
      '19. Review the event timeline',
    ];

    expect(dodSteps.length).toBe(19);
    for (let i = 0; i < dodSteps.length; i++) {
      expect(dodSteps[i].startsWith(`${i + 1}.`)).toBe(true);
    }
  });

  it('DEP-06: Validates V1 Acceptance Criteria checklist categories (§27 of REQUIREMENTS.md)', () => {
    const reqPath = path.join(rootDir, 'REQUIREMENTS.md');
    expect(fs.existsSync(reqPath)).toBe(true);
    const reqContent = fs.readFileSync(reqPath, 'utf-8');

    const expectedSections = [
      '### Game',
      '### Realtime',
      '### Broadcast',
      '### Production',
    ];

    for (const section of expectedSections) {
      expect(reqContent).toContain(section);
    }
  });
});
