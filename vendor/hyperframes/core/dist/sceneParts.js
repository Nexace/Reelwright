export const SCENE_PART_ATTR = "data-hf-scene";
export const SCENE_PARTS_META = "hf-scene-parts";
export const SCENE_FONTS_ATTR = "data-hf-scene-fonts";
export const fontFaceBlocks = (css) => css.match(/@font-face\s*\{[^}]*\}/gi) ?? [];
/** On a scene's top-level host: why the scene cannot be swapped in place, so edits to it reload. */
export const SCENE_NO_SWAP_ATTR = "data-hf-scene-no-swap";
