"use client";

import React from 'react';
import { RefreshCw, Search } from 'lucide-react';

interface StreamEndedCardProps {
  kind: 'ended' | 'error';
  message: string;
  onFindReplacement: () => void;
  onRetry: () => void;
  onClear: () => void;
}

/** Shown over a screen whose stream ended or can't be played. */
const StreamEndedCard: React.FC<StreamEndedCardProps> = ({ kind, message, onFindReplacement, onRetry, onClear }) => (
  <div className="player-state" role="alert">
    <h3>{kind === 'ended' ? 'Siaran berakhir' : 'Tidak bisa diputar'}</h3>
    <p>{message}</p>
    <div className="player-state-actions">
      <button className="btn btn-primary btn-sm" onClick={onFindReplacement}><Search size={14} /> Cari pengganti</button>
      <button className="btn btn-sm" onClick={onRetry}><RefreshCw size={14} /> Coba lagi</button>
      <button className="btn btn-ghost btn-sm" onClick={onClear}>Kosongkan</button>
    </div>
  </div>
);

export default StreamEndedCard;
