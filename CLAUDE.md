# CLAUDE.md — OTVP Dashboard (Legacy)

## Status: Deprecated — Use otvp-app Instead

Single static HTML file (`index.html`, 52KB) originally deployed to Vercel to display trust envelope status for the 11 OTVP security controls. Superseded by **otvp-app**, which adds Supabase auth, agent triggering, and dynamic rendering.

## Repository Structure

```
otvp-dashboard/
├── index.html         # Static dashboard (52KB)
└── CLAUDE.md
```

## Keep For

- Reference for envelope display logic
- Quick static testing
- Fallback if otvp-app has issues

## Do Not

- Add new features here — they go in otvp-app
- Deploy to production — otvp-app is the production interface

## Context

See `~/otvp-projects/CLAUDE.md` for the full OTVP system overview.
