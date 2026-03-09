"use client";

import { useEffect, useState, useCallback } from "react";

interface Tab {
  id: string;
  label: string;
}

interface ToolTabsProps {
  tabs: Tab[];
  defaultTab?: string;
  children: (activeTab: string) => React.ReactNode;
}

export default function ToolTabs({ tabs, defaultTab, children }: ToolTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0].id);

  // Sync from URL hash on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && tabs.some((t) => t.id === hash)) {
      setActiveTab(hash);
    }
  }, [tabs]);

  const handleTabChange = useCallback(
    (id: string) => {
      setActiveTab(id);
      window.history.replaceState(null, "", `#${id}`);
    },
    [],
  );

  return (
    <div>
      <div className="flex gap-1 p-1 bg-bg-surface border border-border mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-accent text-white"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {children(activeTab)}
    </div>
  );
}
