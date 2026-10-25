/** Section pages: just the index menu. No 3D, no smooth-scroll library. */
import { initIndexMenu } from './indexMenu';

const reduce = () => document.documentElement.dataset.motion === 'off';
initIndexMenu({ closeDelay: () => (reduce() ? 0 : 700) });
