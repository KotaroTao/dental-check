'use client';

import { QRCodeSVG } from 'qrcode.react';

type LogoProps = {
  variant?: 'light' | 'dark';
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
};

export function Logo({ variant = 'light', showIcon = true, size = 'md' }: LogoProps) {
  const textColor = variant === 'dark' ? 'text-white' : 'text-gray-900';

  const textSize = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
  }[size];

  const qrSize = {
    sm: 24,
    md: 32,
    lg: 40,
  }[size];

  return (
    <span className={`flex items-center gap-2 font-bold ${textSize} ${textColor}`}>
      {showIcon && (
        <span className="bg-white rounded p-0.5 flex items-center justify-center">
          <QRCodeSVG
            value="https://qrqr-dental.com/"
            size={qrSize}
            level="M"
            bgColor="transparent"
            fgColor="#2563eb"
          />
        </span>
      )}
      <span>
        QRくるくる<span className="ml-2 text-[0.5em]">診断DX</span>
      </span>
    </span>
  );
}
