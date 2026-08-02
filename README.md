# Preface

In a moment of nostalgia and reminiscence, I asked moonshot/Kimi-K3 to re-create a game similar to the classic Micro Machines racing game I played as a kid.

It did a remarkable job as you can see, in only 2 prompts and in about 20 mins of work using the [pi](pi.dev) harness.

Below I attach the 2 prompts I used to make this game. Everything else in this repo is created by the model.

[Try the game out!](ovanveljanoski.github.io/micromachines/)

<details>
<summary>Initial prompt</summary>
In the current folder, create a replica of the famous racing game micromachines.
Use threejs what whatever helpful light JS libraries you need. Node is installed on the system.

Make it a single player, but a racelike thing. Include few levels (desktop, and a couple of ideas).

Be a harsh critic in terms of :
- code quality
- game playability + physics
- game aesthetics
- resemblence to the original

You must deliver a AAA quality. Run a gountlet: design and implement, then subagents critique the work. Tthen repeat the process until all subagents and yourself are 100% convinced that this is the best possible outcome.

Do not stop until you get a perfectly playable game!"
</details>

<details>
<summary>Prompt 2</summary>
"Some feedback:

- THe controls of the car are opposite to what I expect (e.g. turning left turns the car right etc..) This is the most important point
- The tracks are nice but it is not clear where the path should go.. some more obvious indicators are needed, but i like the open-worldness of it
- The speed up arrows are confising as they point in the direction you are coming from and not where you should be going.

Some improvements to the game itself:
Add a car chooser option:
Have 4 choices, but make them balanced between (handling, speed, acceleration, x-factor). None should be better than the rest. If a player chooses one, the AI drives the others. The cars should be different shapes (models) in addition to having different colours.

Put this all throught the gountlent as before: a group of subagents are making the game, another group are reviewing from all possible angles (code, artistic, playability, physics, sensible controls, etc.. )."
</details>
---



# MICRO MACHINES — Tabletop Turbo

A loving, fan-made tribute to Codemasters' legendary **Micro Machines** (1991):
top-down, micro-scale racing across giant household environments — now in 3D
with Three.js, fully procedural (zero art/audio assets).

![status](https://img.shields.io/badge/status-playable-brightgreen)

## Play

```bash
npm start          # serves on http://localhost:8620
```

Any static file server works (no build step needed).

## Game

- **4 circuits**: Desktop Derby, Breakfast Grand Prix, Garden Gauntlet, Pool Hall Hustle
- **4 machines in the Garage** — no best pick, all sim-verified within ~3% on every track:
  | Car | Character | X-Factor |
  |-----|-----------|----------|
  | **BLAZE GT** | the honest all-rounder | — |
  | **SLIPSTREAM** | top-speed monster, drifty | engine squeezes more boost |
  | **DIRT DEVIL** | rocket-start off-roader | hazard goo barely bites |
  | **APEX JR** | glue-tired pocket formula | keeps steering bite at speed |
- The rivals race the machines you didn't pick
- **3 laps** vs 3 AI rivals (rubber-banded, per-car AI skills)
- Falls (off the table / into ponds & pockets) rescue you to the last checkpoint
- **Chevron boost pads**, slippery spills, sticky jam, drifting
- Racing line: dashed guide line + corner chevrons + red/white edge warnings
- Best lap records saved per car & circuit (localStorage)

### Controls

| Key | Action |
|-----|--------|
| ↑ / W | Accelerate |
| ↓ / S | Brake / Reverse |
| ← → / A D | Steer |
| SPACE | Handbrake (drift!) |
| P / ESC | Pause |
| R | Restart race |
| M | Mute |
| ENTER | Confirm / Next |

## Tech

- **Three.js** (vendored, no CDN at runtime), one directional + hemi light rig, PCF soft shadows, ACES tone mapping
- **Pure-data levels**: every level declares "solids" that compile into *both* collision walls/circles/zones *and* their 3D props — collision and visuals can never drift apart
- **Deterministic arcade physics**: fixed 120 Hz timestep, semi-implicit bicycle-ish model with frame-decomposed drift (velocity projected into the rotated heading frame, lateral slip bled off by grip)
- Checkpoint gates with monotone race-score standings, wrong-way detection by score regression, AI with corner speed planning + per-gate `vmax` hints + segment-time auto-recovery
- **Synthesized audio** (WebAudio oscillators/noise only): engine, skids, impacts, boosts, fanfares

## Dev / QA harness

```bash
npm run simulate   # headless full AI races on every level (physics/line validation)
node test/shoot.mjs   # headless screenshots of title + all levels
node test/flow.mjs    # UI flow shots (menus, countdown, results)
node test/drive.mjs   # real-key driving probe (accel, drift, wrong-way, falls, steering direction)
node test/controls.mjs    # steering-inversion regression guard
node test/vehicleBalance.mjs  # 4 vehicles x 4 tracks solo-pace balance
node test/winrate.mjs   # can a perfect pilot win on any car/track?
node test/arrowMath.mjs # guidance/boost chevron orientation proof
node test/perf.mjs    # fps / drawcalls / tris probe
```

Levels are validated by racing them: AI must finish, corridors must fit the car,
gates must be clear of obstacles, falls must be rare.
