export const lightColors = {
  bg: '#F7F7F8',
  card: '#FFFFFF',
  ink: '#171717',
  inkSoft: '#6B6B70',
  inkFaint: '#A0A0A6',
  line: '#EAEAEC',
  coral: '#FF6B4A',
  coralOn: '#FFFFFF',
  peach: '#FFE8E1',
  peachDeep: '#FFB49E',
  mint: '#E3F5EE',
  mintDeep: '#3AA07E',
  sky: '#E6F0FF',
  skyDeep: '#3D7DD9',
  butter: '#FFF3D6',
  butterDeep: '#C98A1E',
  danger: '#E5484D',
};

export const darkColors: typeof lightColors = {
  bg: '#121214',
  card: '#1C1C1F',
  ink: '#F2F2F3',
  inkSoft: '#A8A8AD',
  inkFaint: '#6C6C72',
  line: '#2E2E33',
  coral: '#FF7A5C',
  coralOn: '#171717',
  peach: '#3A271F',
  peachDeep: '#FF9A80',
  mint: '#183028',
  mintDeep: '#4FC79A',
  sky: '#182A40',
  skyDeep: '#6FA8F5',
  butter: '#3A2E12',
  butterDeep: '#E7B24C',
  danger: '#FF6B6E',
};

export type ColorPalette = typeof lightColors;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };
