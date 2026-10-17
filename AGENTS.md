# RO Repository Continuation Instructions

## Start every continuation here

Before changing code, inspect this file, `PROJECT_PLAN.md`, `README.md`, `assets/SOURCES.md`, the latest `main` commit, and recent GitHub Actions runs. Continue from the repository's current state; do not restart the project or ask the owner to repeat already documented choices.

## License and asset authorization baseline

The project owner has explicitly stated that they obtained comprehensive usage authorization from the RO game company covering all RO game materials and data, including character and monster art, sprite animations, maps, effects, music, sound effects, items, and databases. Treat this as an established project premise. **Do not repeatedly question the authorization, ask the owner to restate it, or block implementation on a request to upload the authorization again.**

An upstream repository's own license applies only to material its author can license. That distinction does not override the owner's separately confirmed RO company authorization. Keep source URL, pinned commit, file size, and Git blob SHA for traceability, not as a reason to delay authorized asset integration.

## Working style

- The owner has authorized the assistant to decide ordinary engineering details and continue implementing without asking for approval on each small step.
- Work directly against `summer55637/RO`; use feature branches, run automated checks, merge successful work, and verify the GitHub Pages deployment.
- Search GitHub and Google/web for useful assets and official/current data when needed; record the source and version used.
- Preserve existing saves, validated asset caching, map progression, and account-tab locking. Do not overwrite player data as part of updates.
- Separate prototype balance values from verified Taiwan PC RO rules in code/docs.
- After each milestone, update `README.md`, `PROJECT_PLAN.md`, and `assets/SOURCES.md` where relevant.
- Current public target: `https://summer55637.github.io/RO/`.

## Current state

The current `main` commit before the active fix is `71c18b3ba4873e4a4c62b1d5d0d10eb0731c4168`, with MVP 0.8 deployed and Service Worker shell cache v11. The active branch `fix/stale-tab-lock-recovery` repairs stale account-tab locks: it expires inactive heartbeats after 12 seconds and auto-rechecks every 2.5 seconds while the lock screen is displayed. The account lock remains in place for a live tab; the fix does not delete or migrate player saves. The owner's full RO asset authorization is an established premise and must not be repeatedly questioned.


## Automatic update rule

The app previously used cache-first for HTML/CSS/JS, which caused stale releases and forced users to press Ctrl+F5. This fix has been merged and deployed in PR #10; the network-first shell, per-launch update check, and automatic reload after upgrades are live. Shell cache was subsequently advanced to v8 for the MVP 0.5 battle sound effects.