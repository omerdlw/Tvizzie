import localFont from 'next/font/local';

export const geistSans = localFont({
  variable: '--font-openai-sans',
  src: [
    { path: './openai/OpenAISans-Light.woff2', weight: '300', style: 'normal' },
    { path: './openai/OpenAISans-LightItalic.woff2', weight: '300', style: 'italic' },
    { path: './openai/OpenAISans-Regular.woff2', weight: '400', style: 'normal' },
    { path: './openai/OpenAISans-RegularItalic.woff2', weight: '400', style: 'italic' },
    { path: './openai/OpenAISans-Medium.woff2', weight: '500', style: 'normal' },
    { path: './openai/OpenAISans-MediumItalic.woff2', weight: '500', style: 'italic' },
    { path: './openai/OpenAISans-Semibold.woff2', weight: '600', style: 'normal' },
    { path: './openai/OpenAISans-SemiboldItalic.woff2', weight: '600', style: 'italic' },
    { path: './openai/OpenAISans-Bold.woff2', weight: '700', style: 'normal' },
    { path: './openai/OpenAISans-BoldItalic.woff2', weight: '700', style: 'italic' },
  ],
});

export const zuume = localFont({
  variable: '--font-zuume',
  src: [{ path: './zuume/Zuume-Bold.woff2', weight: '700', style: 'normal' }],
});
