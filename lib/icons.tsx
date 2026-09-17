import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'home'
  | 'calendar'
  | 'record'
  | 'info'
  | 'profile'
  | 'bell'
  | 'camera'
  | 'plus'
  | 'chevL'
  | 'chevR'
  | 'chevD'
  | 'x'
  | 'feed'
  | 'meal'
  | 'sleep'
  | 'diaper'
  | 'shot'
  | 'check'
  | 'person'
  | 'temp'
  | 'water'
  | 'snack'
  | 'play'
  | 'star';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

const strokeProps = {
  fill: 'none',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function Icon({ name, size = 20, color = '#000' }: IconProps) {
  switch (name) {
    case 'home':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4 11.5 12 4l8 7.5" stroke={color} {...strokeProps} />
          <Path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" stroke={color} {...strokeProps} />
        </Svg>
      );
    case 'calendar':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={4} y={5.5} width={16} height={14.5} rx={3} stroke={color} {...strokeProps} />
          <Path d="M4 10h16" stroke={color} {...strokeProps} />
          <Path d="M8 3.5v3.5M16 3.5v3.5" stroke={color} {...strokeProps} />
          <Circle cx={9} cy={14} r={1} fill={color} />
          <Circle cx={12} cy={14} r={1} fill={color} />
          <Circle cx={15} cy={14} r={1} fill={color} />
        </Svg>
      );
    case 'record':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={5.5} y={4.5} width={13} height={16} rx={2.5} stroke={color} {...strokeProps} />
          <Path d="M9 4V3.6a1.6 1.6 0 0 1 1.6-1.6h2.8A1.6 1.6 0 0 1 15 3.6V4" stroke={color} {...strokeProps} />
          <Path d="M8.5 11h7M8.5 14.5h7M8.5 18h4" stroke={color} {...strokeProps} />
        </Svg>
      );
    case 'info':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={8.5} stroke={color} {...strokeProps} />
          <Path d="M12 11v5.2" stroke={color} {...strokeProps} />
          <Circle cx={12} cy={8} r={1} fill={color} />
        </Svg>
      );
    case 'profile':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={8.3} r={3.3} stroke={color} {...strokeProps} />
          <Path d="M5 19c1-3.3 4-5 7-5s6 1.7 7 5" stroke={color} {...strokeProps} />
        </Svg>
      );
    case 'bell':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M6 10.5a6 6 0 0 1 12 0c0 4 1.4 5.4 1.4 5.4H4.6S6 14.5 6 10.5Z" stroke={color} {...strokeProps} />
          <Path d="M10 19a2.2 2.2 0 0 0 4 0" stroke={color} {...strokeProps} />
        </Svg>
      );
    case 'camera':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.2-2h6.6l1.2 2h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5Z"
            stroke={color}
            {...strokeProps}
          />
          <Circle cx={12} cy={12.5} r={3.4} stroke={color} {...strokeProps} />
        </Svg>
      );
    case 'plus':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 5v14M5 12h14" stroke={color} fill="none" strokeWidth={2.2} strokeLinecap="round" />
        </Svg>
      );
    case 'chevL':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M15 5l-7 7 7 7" stroke={color} {...strokeProps} strokeWidth={2} />
        </Svg>
      );
    case 'chevR':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M9 5l7 7-7 7" stroke={color} {...strokeProps} strokeWidth={2} />
        </Svg>
      );
    case 'chevD':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M5 8l7 7 7-7" stroke={color} {...strokeProps} strokeWidth={2} />
        </Svg>
      );
    case 'x':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M6 6l12 12M18 6L6 18" stroke={color} fill="none" strokeWidth={2} strokeLinecap="round" />
        </Svg>
      );
    case 'feed':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M10 2.5h4l.6 2.3-1.1 1.2v1.3c2.6.7 4.5 2.9 4.5 5.6v6a2.1 2.1 0 0 1-2.1 2.1H10a2.1 2.1 0 0 1-2.1-2.1v-6c0-2.7 1.9-4.9 4.5-5.6V6l-1.1-1.2Z"
            stroke={color}
            {...strokeProps}
          />
          <Path d="M8 15h8" stroke={color} {...strokeProps} />
        </Svg>
      );
    case 'meal':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4.5 11a7.5 6 0 0 0 15 0Z" stroke={color} {...strokeProps} />
          <Path d="M4.5 11h15" stroke={color} {...strokeProps} />
          <Path d="M8 16.5 7 20M16 16.5l1 3.5" stroke={color} {...strokeProps} />
        </Svg>
      );
    case 'sleep':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M20 13.5A8 8 0 1 1 10.5 4a6.3 6.3 0 0 0 9.5 9.5Z" stroke={color} {...strokeProps} />
        </Svg>
      );
    case 'diaper':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4 5.5h16M4 5.5c0 7-1 11.5 8 13 9-1.5 8-6 8-13" stroke={color} {...strokeProps} />
          <Path d="M9 12.2a3 3 0 0 0 6 0" stroke={color} {...strokeProps} />
        </Svg>
      );
    case 'shot':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="m18.5 5.5-1 1M4 20l4.8-4.8M9.2 9.2l5.6 5.6M11 7.4l5.6 5.6 2-2-5.6-5.6a1.4 1.4 0 0 0-2 0l-2 2a1.4 1.4 0 0 0 0 2Z"
            stroke={color}
            {...strokeProps}
          />
        </Svg>
      );
    case 'check':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M5 12.5l4.5 4.5L19 7" stroke={color} fill="none" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'person':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={9} r={3.6} stroke={color} fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
          <Path
            d="M5.5 19c1.3-3.6 4.3-5.5 6.5-5.5s5.2 1.9 6.5 5.5"
            stroke={color}
            fill="none"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'temp':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M10 14.2V5.5a2 2 0 0 1 4 0v8.7a3.5 3.5 0 1 1-4 0Z" stroke={color} {...strokeProps} />
          <Path d="M12 8v5.3" stroke={color} {...strokeProps} />
        </Svg>
      );
    case 'water':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 3c-3.6 4.6-6 8-6 11a6 6 0 0 0 12 0c0-3-2.4-6.4-6-11Z" stroke={color} {...strokeProps} />
        </Svg>
      );
    case 'snack':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={8.3} stroke={color} {...strokeProps} />
          <Circle cx={9.3} cy={10} r={1} fill={color} />
          <Circle cx={14.3} cy={9} r={1} fill={color} />
          <Circle cx={14.8} cy={14} r={1} fill={color} />
          <Circle cx={9.8} cy={14.8} r={1} fill={color} />
        </Svg>
      );
    case 'play':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={3.5} y={3.5} width={7} height={7} rx={1.6} stroke={color} {...strokeProps} />
          <Rect x={13.5} y={3.5} width={7} height={7} rx={1.6} stroke={color} {...strokeProps} />
          <Rect x={3.5} y={13.5} width={7} height={7} rx={1.6} stroke={color} {...strokeProps} />
          <Circle cx={17} cy={17} r={3.5} stroke={color} {...strokeProps} />
        </Svg>
      );
    case 'star':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M12 3.5l2.4 5.1 5.6.6-4.2 3.8 1.2 5.5L12 15.8l-5 2.7 1.2-5.5-4.2-3.8 5.6-.6Z"
            stroke={color}
            {...strokeProps}
          />
        </Svg>
      );
    default:
      return null;
  }
}
