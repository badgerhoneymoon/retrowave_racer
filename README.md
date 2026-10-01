# Neon Overdrive — Retrowave Racer

A synthwave driving game for desktop browsers. Built with React, TypeScript and Three.js.

## Controls

| Action | Keys |
| --- | --- |
| Accelerate / brake and reverse | W / S or ↑ / ↓ |
| Steer | A / D or ← / → |
| Plasma gun | Hold Space |
| Rockets | E or Q; legacy M remains supported |
| Sound | R |
| Reflective road | T |
| Restart | Reload the page |

E/Q keep rockets next to the driving hand; Space leaves plasma on the thumb. Multiple keys and aliases can be held together. Losing window focus or hiding the tab releases all driving and weapon inputs. Text fields and browser shortcuts keep their normal keyboard behavior.

## Local checks

Run TypeScript with `npx tsc --noEmit`, then build with `npm run build`. For controlled rendering comparisons, `?profile&seed=42` provides a five-second warmup and twenty-second sample window at the current viewport. The profile reports browser frame intervals, CPU update/render submission time, draw calls and triangles; it does not measure GPU execution time. Ordinary gameplay keeps random spawns.
