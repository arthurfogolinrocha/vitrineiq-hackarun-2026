import React from 'react';
import { AbsoluteFill, Easing, interpolate } from 'remotion';
import type {
  TransitionPresentation,
  TransitionPresentationComponentProps,
} from '@remotion/transitions';

export type PerspectiveFlyProps = {
  direction?: 'forward' | 'bank-left' | 'bank-right';
};

const PerspectiveFlyPresentation: React.FC<
  TransitionPresentationComponentProps<PerspectiveFlyProps>
> = ({ children, presentationDirection, presentationProgress, passedProps }) => {
  const dir = passedProps.direction ?? 'forward';
  const tilt = dir === 'bank-left' ? -10 : dir === 'bank-right' ? 10 : 0;

  if (presentationDirection === 'exiting') {
    const t = Easing.bezier(0.55, 0.05, 0.9, 0.3)(presentationProgress);
    const z = interpolate(t, [0, 1], [0, 480]);
    const scale = interpolate(t, [0, 1], [1, 1.16]);
    const rotY = interpolate(t, [0, 1], [0, tilt * 1.1]);
    const rotX = interpolate(t, [0, 1], [0, 5]);
    const opacity = interpolate(presentationProgress, [0, 0.58], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const blur = interpolate(presentationProgress, [0, 0.58], [0, 5], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

    return (
      <AbsoluteFill
        style={{
          opacity,
          filter: blur > 0.2 ? `blur(${blur}px)` : undefined,
          transform: `perspective(1500px) translateZ(${z}px) scale(${scale}) rotateY(${rotY}deg) rotateX(${rotX}deg)`,
          transformOrigin: '50% 50%',
        }}
      >
        {children}
      </AbsoluteFill>
    );
  }

  // entering
  const enterT = interpolate(presentationProgress, [0.18, 1], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const z = interpolate(enterT, [0, 1], [-520, 0]);
  const scale = interpolate(enterT, [0, 1], [0.87, 1]);
  const rotY = interpolate(enterT, [0, 1], [-tilt * 0.85, 0]);
  const rotX = interpolate(enterT, [0, 1], [-7, 0]);
  const opacity = interpolate(presentationProgress, [0.18, 0.60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const blur = interpolate(presentationProgress, [0.18, 0.60], [4, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        opacity,
        filter: blur > 0.2 ? `blur(${blur}px)` : undefined,
        transform: `perspective(1500px) translateZ(${z}px) scale(${scale}) rotateY(${rotY}deg) rotateX(${rotX}deg)`,
        transformOrigin: '50% 50%',
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export const perspectiveFly = (
  props: PerspectiveFlyProps = {}
): TransitionPresentation<PerspectiveFlyProps> => ({
  component: PerspectiveFlyPresentation,
  props,
});

