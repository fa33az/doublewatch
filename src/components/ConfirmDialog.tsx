"use client";

import React from 'react';
import Dialog, { DialogHeader } from './Dialog';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ title, message, confirmLabel, danger, onConfirm, onCancel }) => (
  <Dialog label={title} onClose={onCancel} size="sm">
    <DialogHeader title={title} onClose={onCancel} />
    <div className="dialog-body">
      <p className="dialog-message">{message}</p>
    </div>
    <div className="dialog-footer">
      <button className="btn btn-ghost" onClick={onCancel} data-autofocus>Batal</button>
      <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{confirmLabel}</button>
    </div>
  </Dialog>
);

export default ConfirmDialog;
