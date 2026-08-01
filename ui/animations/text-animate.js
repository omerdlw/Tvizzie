'use client';

import { BlurryText } from './blurry-text';

export function TextAnimate({
  children,
  className,
  delay = 0.1,
  duration = 0.5,
  segmentClassName,
  as = 'p',
  by = 'word',
  ...props
}) {
  return (
    <BlurryText
      as={as}
      by={by}
      delay={delay}
      duration={duration}
      className={className}
      segmentClassName={segmentClassName}
      {...props}
    >
      {children}
    </BlurryText>
  );
}

export { BlurryText };

