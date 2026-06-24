import React from 'react';
import { Settings } from 'lucide-react';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
        <p className="text-xs text-muted-foreground">
          Configure application variables, email integrations, and modules.
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-16 text-center text-muted-foreground space-y-3 shadow-md">
        <Settings className="w-10 h-10 text-muted-foreground mx-auto" />
        <p className="text-sm font-semibold">Settings panel ready</p>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          System settings are currently using environment defaults. Custom configuration parameters can be added here.
        </p>
      </div>
    </div>
  );
}
