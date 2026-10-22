import recurrences from './recurrences.js';
import recursionTree from './recursion-tree.js';
import whoWins from './who-wins.js';
import threeCases from './three-cases.js';
import finePrint from './fine-print.js';
import memorize from './memorize.js';
import practice from './practice.js';
import walkthrough from './walkthrough.js';
import { heroFrames } from '../model/frames.js';

/** Reading order. Groups: Intuition, The theorem, Practice. */
export const chapters = [recurrences, recursionTree, whoWins, threeCases, finePrint, memorize, practice, walkthrough];

export const hero = () => ({ title: 'Where the work goes: three recursion trees', frames: heroFrames(), view: { height: 380 } });

export const legend = [
  { sym: '<span class="tg tg-case1">leaves</span>', text: 'case 1: the leaves do most of the work, T(n) = \u0398(n<sup>log<sub>b</sub> a</sup>)' },
  { sym: '<span class="tg tg-case2">tie</span>', text: 'case 2: every level does the same work, so multiply by the number of levels, log n' },
  { sym: '<span class="tg tg-case3">root</span>', text: 'case 3: the root does most of the work, T(n) = \u0398(f(n))' },
  { sym: '<span class="tg tg-none">none</span>', text: 'the theorem does not apply (wrong form, or a gap between the cases)' },
];
