import React from 'react';
import { Composition } from 'remotion';
import { MarketingVideo, TOTAL_DURATION_FRAMES } from './MarketingVideo';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="VitrineIQMarketing60fps"
      component={MarketingVideo}
      durationInFrames={TOTAL_DURATION_FRAMES}
      fps={60}
      width={1920}
      height={1080}
    />
  );
};

