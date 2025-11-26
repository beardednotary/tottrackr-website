// TotTrackr Colors — Calm Glass
const tintColorLight = '#5F79D1';  // softer than #6B7FD7
const tintColorDark  = '#7CA0F2';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#FAFBFC',
    backgroundSecondary: '#FFFFFF',
    tint: tintColorLight,
    icon: '#6B7280',
    tabIconDefault: '#6B7280',
    tabIconSelected: tintColorLight,
    textSecondary: '#6B7280',
    border: 'rgba(0,0,0,0.08)',
    shadow: '#000000',
    success: '#0FA36B',
    error: '#EF4444',

    glassBackground: 'rgba(255,255,255,0.65)',
    glassBorder: 'rgba(0,0,0,0.08)',

    feeding: { // desaturated indigo
      primary:  '#5F79D1',                
      secondary:'rgba(95,121,209,0.12)',
      glass:    'rgba(95,121,209,0.08)',
    },
    sleep: {   // soft sea-mint
      primary:  '#6ECBB9',                
      secondary:'rgba(110,203,185,0.12)',
      glass:    'rgba(110,203,185,0.08)',
    },
    diaper: {  // honey amber
      primary:  '#E5A862',                
      secondary:'rgba(229,168,98,0.14)',
      glass:    'rgba(229,168,98,0.09)',
    },
  },
  dark: {
    text: '#ECEDEE',
    background: '#0A0A0F',
    backgroundSecondary: '#17171F',
    tint: tintColorDark,
    icon: '#A0A6AD',
    tabIconDefault: '#A0A6AD',
    tabIconSelected: tintColorDark,
    textSecondary: '#9CA3AF',
    border: 'rgba(255,255,255,0.10)',
    shadow: '#000000',
    success: '#17B27B',
    error: '#EF4444',

    glassBackground: 'rgba(23,23,31,0.55)',
    glassBorder: 'rgba(255,255,255,0.12)',

    feeding: {
      primary:  '#7CA0F2',
      secondary:'rgba(124,160,242,0.18)',
      glass:    'rgba(124,160,242,0.12)',
    },
    sleep: {
      primary:  '#7FD4C5',
      secondary:'rgba(127,212,197,0.18)',
      glass:    'rgba(127,212,197,0.12)',
    },
    diaper: {
      primary:  '#F1B777',
      secondary:'rgba(241,183,119,0.18)',
      glass:    'rgba(241,183,119,0.12)',
    },
  },
};
