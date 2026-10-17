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
- Preserve existing saves, validated asset caching, and map progression. The owner explicitly requested removal of account-tab locking; do not reintroduce its blocking screen unless asked. Multiple live tabs may overwrite shared localStorage data, so document this risk. Do not overwrite or reset player data as part of updates.
- Separate prototype balance values from verified Taiwan PC RO rules in code/docs.
- After each milestone, update `README.md`, `PROJECT_PLAN.md`, and `assets/SOURCES.md` where relevant.
- Current public target: `https://summer55637.github.io/RO/`.

## Current state

At the start of the MVP 1.3 continuation, main was 022bc0014fb6c0b3d5f970e6d2c66decf2ce2957, PR #20 had merged, MVP 1.2 card extraction and prototype equipment sales were deployed, and Service Worker shell cache was v17. This milestone expands the equipment/card catalog and monster drops. Re-fetch the current main SHA and Actions runs at every continuation. The account-tab lock remains fully removed; preserve ro-h5-account-v1 and all player data. The owner's full RO asset authorization is an established premise and must not be repeatedly questioned.


## Automatic update rule

The app previously used cache-first for HTML/CSS/JS, which caused stale releases and forced users to press Ctrl+F5. This fix has been merged and deployed in PR #10; the network-first shell, per-launch update check, and automatic reload after upgrades are live. Shell cache was subsequently advanced to v8 for the MVP 0.5 battle sound effects.