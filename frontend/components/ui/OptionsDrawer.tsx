'use client';

import React from 'react';
import { DeleteIcon, ShareIcon, SaveIcon } from '../../lib/icons';

export interface DrawerButton {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  iconColor?: string;
}

interface OptionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  onSave?: () => void;
  showDeleteOption?: boolean;
  isSaved?: boolean;
  customButtons?: DrawerButton[];
}

export default function OptionsDrawer({
  isOpen,
  onClose,
  onDelete,
  onShare,
  onSave,
  showDeleteOption = true,
  isSaved = false,
  customButtons
}: OptionsDrawerProps) {
  if (!isOpen) return null;

  const handleSaveClick = () => {
    onSave?.();
    onClose();
  };

  // Default buttons if no custom ones provided
  const defaultButtons: DrawerButton[] = [];
  
  if (showDeleteOption && onDelete) {
    defaultButtons.push({
      label: 'Delete',
      icon: <DeleteIcon className="size-6 mr-4 text-red-500" />,
      onClick: () => { onDelete(); onClose(); },
      iconColor: 'text-red-500'
    });
  }
  
  if (onShare) {
    defaultButtons.push({
      label: 'Share',
      icon: <ShareIcon className="size-6 mr-4 text-green-500" />,
      onClick: () => { onShare(); onClose(); },
      iconColor: 'text-green-500'
    });
  }
  
  if (onSave) {
    defaultButtons.push({
      label: isSaved ? 'Unsave' : 'Save',
      icon: <SaveIcon className={`size-6 mr-4 ${isSaved ? 'text-yellow-400' : 'text-yellow-500'}`} isSaved={isSaved} />,
      onClick: handleSaveClick,
      iconColor: isSaved ? 'text-yellow-400' : 'text-yellow-500'
    });
  }

  const buttons = customButtons || defaultButtons;

  return (
    <>
      {/* Backdrop with blur effect */}
      <div 
        className="fixed inset-0 backdrop-blur-md z-40"
        onClick={onClose}
      />
      
      {/* Bottom Drawer */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 rounded-t-2xl z-50 animate-slide-up">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1 bg-gray-600 rounded-full" />
        </div>

        {/* Options List */}
        <div className="py-2">
          {buttons.map((button, index) => (
            <button 
              key={index}
              onClick={button.onClick}
              className="w-full flex items-center px-6 py-4 text-gray-200 hover:bg-gray-700 transition-colors"
            >
              {button.icon}
              <span className="text-lg">{button.label}</span>
            </button>
          ))}
        </div>

        {/* Cancel Button */}
        <div className="px-4 pb-6">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-gray-700 text-gray-200 rounded-lg font-medium hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
