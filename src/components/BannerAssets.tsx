import React from 'react';

interface AssetProps extends React.SVGProps<SVGSVGElement> {
  fill?: string;
  size?: number;
}

export const VectorStar = ({ fill = '#FF69B4', size = 48, ...props }: AssetProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="#1A1A1A" strokeWidth="1.5" strokeLinejoin="miter" {...props}>
    <path d="M12 2 L15.09 8.26 L22 9.27 L17 14.14 L18.18 21.02 L12 17.77 L5.82 21.02 L7 14.14 L2 9.27 L8.91 8.26 Z" />
  </svg>
);

export const RobotHead = ({ fill = '#A0AEC0', size = 48, ...props }: AssetProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill={fill} stroke="#1A1A1A" strokeWidth="1.5" strokeLinejoin="round" {...props}>
    {/* Antenna */}
    <line x1="16" y1="8" x2="16" y2="4" />
    <circle cx="16" cy="3" r="1.5" fill="#FF69B4" />
    {/* Ears */}
    <rect x="4" y="14" width="2" height="6" fill="#FF69B4" />
    <rect x="26" y="14" width="2" height="6" fill="#FF69B4" />
    {/* Head */}
    <rect x="6" y="8" width="20" height="18" rx="2" fill={fill} />
    {/* Eyes */}
    <circle cx="12" cy="14" r="2" fill="#1A1A1A" />
    <circle cx="20" cy="14" r="2" fill="#1A1A1A" />
    {/* Mouth */}
    <rect x="11" y="20" width="10" height="3" fill="#1A1A1A" />
    <line x1="13" y1="20" x2="13" y2="23" stroke="white" strokeWidth="0.5"/>
    <line x1="16" y1="20" x2="16" y2="23" stroke="white" strokeWidth="0.5"/>
    <line x1="19" y1="20" x2="19" y2="23" stroke="white" strokeWidth="0.5"/>
  </svg>
);

export const FacetedPolygon = ({ fill = '#68D391', size = 48, ...props }: AssetProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill={fill} stroke="#1A1A1A" strokeWidth="1.5" strokeLinejoin="round" {...props}>
    <polygon points="16,2 29,9 29,23 16,30 3,23 3,9" />
    {/* Inner facets */}
    <polygon points="16,2 24,12 16,18 8,12" fill="white" fillOpacity="0.2"/>
    <polygon points="29,9 29,23 16,18 24,12" />
    <polygon points="3,9 8,12 16,18 3,23" fill="black" fillOpacity="0.1"/>
    <polygon points="16,30 29,23 16,18" fill="black" fillOpacity="0.2"/>
    <polygon points="16,30 16,18 3,23" fill="white" fillOpacity="0.1"/>
  </svg>
);

export const IsometricCube = ({ fill = '#FFB6C1', size = 48, ...props }: AssetProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32" stroke="#1A1A1A" strokeWidth="1.5" strokeLinejoin="round" {...props}>
    {/* Top face */}
    <polygon points="16,4 26,9 16,14 6,9" fill={fill} />
    {/* Right face */}
    <polygon points="16,14 26,9 26,21 16,26" fill={fill} fillOpacity="0.8" />
    {/* Left face */}
    <polygon points="16,14 16,26 6,21 6,9" fill={fill} fillOpacity="0.6" />
  </svg>
);

export const Pyramid = ({ fill = '#4299E1', size = 48, ...props }: AssetProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32" stroke="#1A1A1A" strokeWidth="1.5" strokeLinejoin="round" {...props}>
    <polygon points="16,4 28,24 16,28" fill={fill} fillOpacity="0.8" />
    <polygon points="16,4 16,28 4,24" fill={fill} fillOpacity="0.6" />
  </svg>
);
