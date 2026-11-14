import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadJakarta } from '@remotion/google-fonts/PlusJakartaSans';
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono';

const inter = loadInter('normal', { weights: ['400', '500', '600', '700'], subsets: ['latin'] });
const jakarta = loadJakarta('normal', { weights: ['600', '700', '800'], subsets: ['latin'] });
const mono = loadMono('normal', { weights: ['500', '700'], subsets: ['latin'] });

export const FONTS = {
  sans: inter.fontFamily,
  display: jakarta.fontFamily,
  mono: mono.fontFamily,
};

export const PALETTE = {
  obsidian: '#08090D',
  obsidianElevated: '#11141C',
  gold: '#E2A83B',
  goldBright: '#FCD34D',
  cyan: '#22D3EE',
  emerald: '#10B981',
  rose: '#F43F5E',
  text: '#F8FAFC',
  muted: '#94A3B8',
};

