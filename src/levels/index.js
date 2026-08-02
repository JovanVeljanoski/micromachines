// ============================================================
// levels/index.js — level registry, compiled for physics use.
// ============================================================
import { compileLevel } from './helpers.js';
import { data as desktop } from './desktop.js';
import { data as breakfast } from './breakfast.js';
import { data as garden } from './garden.js';
import { data as pool } from './pool.js';

export const LEVELS = [desktop, breakfast, garden, pool].map(d => compileLevel(d));
export const LEVEL_BY_ID = Object.fromEntries(LEVELS.map(l => [l.id, l]));
