"use client";

import React from 'react';
import { SHORTCUT_GROUPS } from '../lib/shortcuts';
import Dialog, { DialogHeader } from './Dialog';

/** The shortcut table, shared by Settings → Shortcut and the "?" dialog. */
export const ShortcutList: React.FC = () => (
  <div className="stack-lg">
    {SHORTCUT_GROUPS.map(group => (
      <section key={group.title} className="shortcut-group">
        <h3 className="section-title">{group.title}</h3>
        {group.items.map(s => (
          <div key={s.desc} className="shortcut">
            <span>{s.desc}</span>
            <span className="shortcut-keys">
              {s.keys.map(k => <kbd key={k} className="kbd">{k}</kbd>)}
            </span>
          </div>
        ))}
      </section>
    ))}
  </div>
);

const ShortcutHelp: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <Dialog label="Shortcut keyboard" onClose={onClose}>
    <DialogHeader title="Shortcut keyboard" onClose={onClose} />
    <div className="dialog-body">
      <ShortcutList />
    </div>
  </Dialog>
);

export default ShortcutHelp;
