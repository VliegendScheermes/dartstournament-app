/**
 * Modal Component
 * Reusable modal dialog
 */

'use client';

import React from 'react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  children: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger' | 'success';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <div className="mb-6">{children}</div>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>
            {cancelText}
          </Button>
          {onConfirm && (
            <Button variant={confirmVariant} onClick={onConfirm}>
              {confirmText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
