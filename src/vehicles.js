// ============================================================
// vehicles.js — the four machines. Balanced trade-offs, no
// dominant pick; every car has an "x-factor" special.
// tune fields override CAR physics constants per car.
// ============================================================

export const VEHICLES = [
  {
    id: 'sports',
    model: 0,
    name: 'BLAZE GT',
    color: 0xd43a2f,
    accent: 0xffffff,
    desc: 'The red all-rounder. Sharp, honest, quick everywhere.',
    tune: { maxSpeed: 5.3, engine: 10.9, grip: 8.5, maxSteer: 0.62, steerHighSpeedLoss: 0.17 },
    aiSkill: 0.96,
    special: {},
    bars: { speed: 3, accel: 3, grip: 3 },
  },
  {
    id: 'drag',
    model: 1,
    name: 'SLIPSTREAM',
    color: 0x2f6fd4,
    accent: 0xffd23a,
    desc: 'Top-speed monster. Lazy in the twisties, but that huge engine squeezes every drop of boost.',
    tune: { maxSpeed: 5.45, engine: 10.2, grip: 6.6, maxSteer: 0.55, steerHighSpeedLoss: 0.22 },
    aiSkill: 0.925,
    special: { boostDur: 1.12 },
    bars: { speed: 5, accel: 2, grip: 2 },
  },
  {
    id: 'buggy',
    model: 2,
    name: 'DIRT DEVIL',
    color: 0xe8b62a,
    accent: 0x20242e,
    desc: 'Chunky off-roader. Rocket start, and mud, milk and jam barely bother those monster tires.',
    tune: { maxSpeed: 5.15, engine: 12.2, grip: 8.8, maxSteer: 0.64, steerHighSpeedLoss: 0.17 },
    aiSkill: 0.985,
    special: { zoneGripFloor: 0.62, zoneDragMul: 0.45 },
    bars: { speed: 2, accel: 5, grip: 3 },
  },
  {
    id: 'f1',
    model: 3,
    name: 'APEX JR',
    color: 0x37a04c,
    accent: 0xf2f2f2,
    desc: 'Pocket formula car. Sticks like glue and barely loses steering bite at speed.',
    tune: { maxSpeed: 5.2, engine: 10.0, grip: 10.8, maxSteer: 0.66, steerHighSpeedLoss: 0.115 },
    aiSkill: 0.955,
    special: {},
    bars: { speed: 3, accel: 3, grip: 5 },
  },
];
