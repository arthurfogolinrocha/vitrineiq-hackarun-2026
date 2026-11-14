import React from 'react';
import { Composition } from 'remotion';
import { MarketingVideo, MKT_TOTAL_FRAMES } from './MarketingVideo';
import { PitchVideo, PITCH_TOTAL_FRAMES } from './PitchVideo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="VitrineIQMarketing60fps"
        component={MarketingVideo}
        durationInFrames={MKT_TOTAL_FRAMES}
        fps={60}
        width={1920}
        height={1080}
      />
      <Composition
        id="VitrineIQPitch60fps"
        component={PitchVideo}
        durationInFrames={PITCH_TOTAL_FRAMES}
        fps={60}
        width={1920}
        height={1080}
      />
    </>
  );
};
