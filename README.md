# Cube Assault 3D

A lightweight browser-based 3D shooter built with Three.js and plain HTML/CSS/JS.

## How to run

Because this project uses only static assets and a CDN import, you can run it with any local web server.

### Option 1: Python

```bash
cd /path/to/web-3d-shooter-game
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

### Option 2: VS Code Live Server

Open the folder in VS Code and run it with Live Server.

## Controls

- Move: WASD
- Aim: mouse
- Shoot: left click
- Sprint: Shift
- Restart after death: R

## Gameplay

- Survive waves of enemy cubes
- Clear all enemies to advance to the next wave
- Your health drains if enemies reach you
- Score increases for each enemy defeated

## Files

- `index.html` – app shell
- `style.css` – HUD and overlay styling
- `game.js` – Three.js scene, controls, enemy spawning, and gameplay loop

## Notes

This is intentionally compact and beginner-friendly, so it is easy to expand with sound effects, more weapons, pickups, and larger maps.
