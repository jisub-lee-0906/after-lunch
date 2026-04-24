import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: '영양채움',
  description: '초중학교 급식 데이터 기반 저녁 추천 웹앱',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
