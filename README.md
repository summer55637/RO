# RO — Offline Single-Player Prototype

A free, static, browser-based, Ragnarok Online-inspired single-player prototype. It runs on GitHub Pages and stores progress locally in the player's browser.

## Play

Before the first successful deployment, open the repository's **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**. The connected automation cannot enable Pages on your behalf, so this one-time setting must be done by a repository owner. Then open **Actions**, select the latest **Deploy static game to GitHub Pages** run, and choose **Re-run jobs** (or push another commit). The workflow in `.github/workflows/deploy.yml` publishes the static game.

## Current prototype features

- Canvas-based pixel-art-inspired field rendered from original shapes (no external image or server dependency).
- Fully point-and-click controls: click the ground to move, or click a Poring-like monster to auto-chase and attack.
- Optional idle hunting automatically finds monsters and attacks them.
- Offline idle rewards on return (up to 8 hours), with EXP, Zeny, and potion drops.
- On-screen buttons for potions and saving; no keyboard input is required.
- Monster pursuit, HP/EXP, levels, potions and drops.
- Local save/load, new game, and downloadable/importable save JSON.
- PWA manifest and service-worker cache for offline play after the first successful load.

## Controls

- **Click or tap the ground:** move your character to that location.
- **Click or tap a monster:** select it; your character automatically approaches and attacks.
- **Use a red potion:** click the potion button or the potion slot.
- **Save/load/export:** use the on-screen buttons.

No keyboard controls are required.

## Idle hunting

Click **開啟放置狩獵** to let the character automatically find and attack Poring-like monsters. The mode and cumulative idle stats are saved locally. When you return after closing the game, elapsed time is settled at an intentionally conservative rate of about one monster every 15 seconds, capped at 8 hours per visit. Offline settlement grants EXP, Zeny, and estimated potion drops. Keep idle hunting enabled before leaving to receive offline rewards.

## Project notes

This is an original, lightweight prototype rather than a complete implementation of the official RO client or server. It does not include official game assets or copied third-party source code. Monster names and numbers in this prototype are starter data. Future RO data/assets should only be added after confirming that the relevant license and permission cover modification, redistribution, and web publication.

No build step, backend, account, or API key is required. Saving uses the browser's local storage; browser data clearing can remove local progress.
