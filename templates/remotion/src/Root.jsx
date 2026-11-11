// One composition, "Film". Length, size and fps come from the kit data props (rm/kit-data.json), never hard-coded.
// Built with Remotion, see remotion.pro/license.
import React from 'react';
import { Composition } from 'remotion';
import { Film } from './Film.jsx';
import { makeKit } from './kit.js';
import { DUR } from './film.mjs';

const EMPTY = { project: { speechEnd: 1, tail: 0 }, vo: {}, music: {}, width: 1920, height: 1080, fps: 30 };

export const Root = () => (
  <Composition id="Film" component={Film} width={1920} height={1080} fps={30} durationInFrames={30} defaultProps={EMPTY}
    calculateMetadata={({ props }) => {
      const k = makeKit(props);
      return { durationInFrames: Math.max(1, Math.ceil(DUR(k) * k.fps)), fps: k.fps, width: k.W_, height: k.H_ };
    }} />
);
