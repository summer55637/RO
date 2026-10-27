# Game asset directory

The game is static and offline-friendly. It supports optional local PNG sprites/backgrounds and OGG audio; if a file is absent, the canvas fallback remains playable.

## Supported files

- `assets/sprites/player.png`: transparent player sprite, ideally a single frame.
- `assets/sprites/monsters/<id>.png`: transparent monster illustrations for the IDs in `src/data.js` (poring, drops, fabre, lunatic, willow, wolf, skeleton, familiar).
- `assets/maps/<name>.png`: optional 960×600 background for each map; keep entrances and collision-free paths clear.
- `assets/sounds/attack.ogg`, `skill.ogg`, `level-up.ogg`, `item-drop.ogg`: short sound effects.

The mapping is recorded in `assets/manifest.json` and `src/data.js`. A normal static PNG is expected; sprite-sheet animation parsing is not implemented yet.

## Important provenance note

This repository currently does not contain the official RO client GRF or authorized RO image/audio files. Therefore it does not redistribute or pretend to include official Gravity artwork. The game loads local files at these paths when supplied, and otherwise draws original fallback graphics. Before adding any actual RO asset, record the exact source, rights holder, license/permission scope, and redistribution permission. Do not commit a GRF, proprietary client files, or artwork scraped from a public preview server.

For exploring a local client you are legally entitled to use, see the open-source tools:
- https://github.com/joaopedrosgs/ragx (asset conversion from a locally owned client; the tool itself does not distribute RO art)
- https://github.com/adsonpleal/ragassets (rendering/extraction tooling; its documentation notes that users must provide their own client resources)

These tools help prepare files; they do not change the copyright status of exported game artwork. Keep the site fully static by exporting the needed sprites into the paths above.
