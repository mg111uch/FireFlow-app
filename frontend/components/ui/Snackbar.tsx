'use client';

import React, { useEffect } from 'react';

interface SnackbarProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function Snackbar({ message, isVisible, onClose, duration = 2000 }: SnackbarProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose, duration]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] animate-fade-in w-full max-w-md px-4">
      <div className="bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg border border-white">
        {message}
      </div>
    </div>
  );
}
