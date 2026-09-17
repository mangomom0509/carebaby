// Matches the color system of the original HTML prototype (Claude Artifact)
// 1:1 — variable names below map directly to that stylesheet's CSS custom
// properties so screens can be ported without re-deriving colors.
export const lightColors = {
  bg: '#F5F5F7', // --cream
  card: '#FFFFFF', // --card-bg
  ink: '#18181B',
  inkSoft: '#8B8B93',
  inkFaint: '#C6C6CC',
  line: '#EDEDF0',
  peach: '#FBECE5',
  peachSoft: '#F0C9A8', // light peach, visible as a small marker (e.g. calendar checkup dot)
  peachDeep: '#E3A583',
  accent: '#1C1C1E', // --coral: the near-black primary accent (buttons, active states)
  accentOn: '#FFFFFF', // --coral-on: text/icon color on top of accent
  accentInk: '#2B241F', // --coral-ink: warm dark text used on peach backgrounds
  mint: '#D9EFE1',
  mintDeep: '#4C9770',
  butter: '#FFF0C9',
  butterDeep: '#C98A1F',
  sky: '#DCE9F7',
  skyDeep: '#4E7FB5',
  warnBg: '#FCEBD3',
  warnInk: '#95591A',
  feverBg: '#FBDCD5',
  feverInk: '#C1402A',
};

export const darkColors: typeof lightColors = {
  bg: '#0F0F11',
  card: '#1E1E21',
  ink: '#F2F2F3',
  inkSoft: '#98989F',
  inkFaint: '#525258',
  line: '#2C2C30',
  peach: '#2E2621',
  peachSoft: '#A56B45',
  peachDeep: '#C98A66',
  accent: '#F2F2F3',
  accentOn: '#18181B',
  accentInk: '#E3D3C3',
  mint: '#28382D',
  mintDeep: '#84CBA6',
  butter: '#3C3018',
  butterDeep: '#E8C468',
  sky: '#25384A',
  skyDeep: '#93BEE6',
  warnBg: '#42320F',
  warnInk: '#F0C27C',
  feverBg: '#4A251E',
  feverInk: '#F0917C',
};

export type ColorPalette = typeof lightColors;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };
