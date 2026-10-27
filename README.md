# RO — Offline Single-Player Prototype

A free, static, browser-based, Ragnarok Online-inspired single-player prototype. It runs on GitHub Pages and stores progress locally in the player's browser.

## Play

Before the first successful deployment, open the repository's **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**. The connected automation cannot enable Pages on your behalf, so this one-time setting must be done by a repository owner. Then open **Actions**, select the latest **Deploy static game to GitHub Pages** run, and choose **Re-run jobs** (or push another commit). The workflow in `.github/workflows/deploy.yml` publishes the static game.

## Current prototype features

- Canvas-based pixel-art-inspired field rendered from original shapes (no external image or server dependency).
- Keyboard/touch movement, click-to-move, and a small field with collision boundaries.
- Poring-like training monster, click/tap to attack, monster pursuit, HP/EXP, levels, potions and drops.
- Local save/load, new game, and downloadable/importable save JSON.
- PWA manifest and service-worker cache for offline play after the first successful load.

## Controls

- **WASD / arrow keys:** move
- **Click or tap the ground:** move there
- **Click or tap a monster:** attack
- **H:** use a potion

## Project notes

This is an original, lightweight prototype rather than a complete implementation of the official RO client or server. It does not include official game assets or copied third-party source code. Monster names and numbers in this prototype are starter data. Future RO data/assets should only be added after confirming that the relevant license and permission cover modification, redistribution, and web publication.

No build step, backend, account, or API key is required. Saving uses the browser's local storage; browser data clearing can remove local progress.
