import heaps from './heaps.js';
import { heroFrames } from '../model/heap.js';

/** Reading order. */
export const chapters = [heaps];

export const hero = () => ({ title: 'Insert 2, then removeMin', frames: heroFrames(), view: { height: 400 } });

export const legend = [
  { sym: '<span class="swatch role-visit"></span>', text: 'the key that is moving (up-heap or down-heap), or the one you clicked' },
  { sym: '<span class="swatch role-path"></span>', text: 'the key it is compared with: its parent (up-heap) or its smaller child (down-heap)' },
  { sym: '<span class="swatch role-info"></span>', text: 'the parent of the key you clicked' },
  { sym: '<span class="swatch role-new"></span>', text: 'a key just added at the last node, or a key that has reached its place' },
  { sym: '<span class="swatch role-remove"></span>', text: 'the minimum, about to be removed' },
];
