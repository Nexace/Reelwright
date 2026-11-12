# Canvas materialize: panel to canvas, diagram cascade

A card grows into the full canvas while a dot grid materialises; nodes then cascade outward along their edges.

Source: video-shotcraft card `canvas-materialize-moves` (shots: panel-to-canvas, diagram-cascade). Helper: `KIT.shotcards` in `tools/shotcards/interaction.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs interaction` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- Opening a whiteboard or a node editor.
- Showing a pipeline as it builds (`diagramCascade`).

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `interaction.js` first, see the index):

```js
const open = KIT.shotcards.panelToCanvas({ title: 'Roadmap', at: snap(W('c', 'open')), dur: KIT.dur(1) });
const flow = KIT.shotcards.diagramCascade({ nodes: [{ label: 'Input', x: 0.5, y: 0.1 }, { label: 'Parse', x: 0.25, y: 0.5 }, { label: 'Plan', x: 0.75, y: 0.5 }], edges: [[0, 1], [0, 2]], at: open.end });
function render(t) { open.set(t); flow.set(t); }
```

## Timing and easing

- The panel's rect, radius and fill interpolate on `power3.inOut`; the dots appear from the centre outwards from 40 % of the way.
- `flow.arrivals` lists each node's time: arrival = parent arrival + `hop` (0.45 s). Edges draw from the parent as the node pops with `back.out(2)`.

## Common mistakes

- A cyclic graph with unreachable nodes: a node with no path from node 0 never appears (its arrival is `Infinity`). Connect everything to node 0.
- Dozens of nodes: the cascade takes depth × `hop`.

[Back to the shotcard index](b-index.md)
