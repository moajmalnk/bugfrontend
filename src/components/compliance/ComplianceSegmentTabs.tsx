import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, Code, Crown, Lock, TestTube } from 'lucide-react';

export type ComplianceTab = 'developer' | 'tester' | 'admin';

interface ComplianceSegmentTabsProps {
  activeTab: ComplianceTab;
  onTabChange: (tab: ComplianceTab) => void;
  developerProgress: { verified: number; total: number };
  testerProgress: { verified: number; total: number };
  testerLocked: boolean;
  adminLocked: boolean;
}

const TABS: { id: ComplianceTab; label: string; shortLabel: string; icon: typeof Code }[] = [
  { id: 'developer', label: 'Developer Matrix', shortLabel: 'Developer', icon: Code },
  { id: 'tester', label: 'Tester Matrix', shortLabel: 'Tester', icon: TestTube },
  { id: 'admin', label: 'Admin Overview', shortLabel: 'Admin', icon: Crown },
];

function getCountLabel(
  tabId: ComplianceTab,
  developerProgress: { verified: number; total: number },
  testerProgress: { verified: number; total: number }
): string | null {
  if (tabId === 'developer') {
    return `${developerProgress.verified}/${developerProgress.total}`;
  }
  if (tabId === 'tester') {
    return `${testerProgress.verified}/${testerProgress.total}`;
  }
  return null;
}

function isTabLocked(
  tabId: ComplianceTab,
  testerLocked: boolean,
  adminLocked: boolean
): boolean {
  return (tabId === 'tester' && testerLocked) || (tabId === 'admin' && adminLocked);
}

export function ComplianceSegmentTabs({
  activeTab,
  onTabChange,
  developerProgress,
  testerProgress,
  testerLocked,
  adminLocked,
}: ComplianceSegmentTabsProps) {
  const [isMobileTabSelectorOpen, setIsMobileTabSelectorOpen] = useState(false);
  const activeTabMeta = TABS.find((tab) => tab.id === activeTab) ?? TABS[0];
  const ActiveIcon = activeTabMeta.icon;
  const activeCountLabel = getCountLabel(activeTab, developerProgress, testerProgress);
  const activeLocked = isTabLocked(activeTab, testerLocked, adminLocked);

  const handleTabSelect = (tabId: ComplianceTab) => {
    onTabChange(tabId);
    setIsMobileTabSelectorOpen(false);
  };

  return (
    <div className="relative w-full">
      <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-blue-50/50 dark:from-gray-800/50 dark:to-blue-900/50 rounded-2xl pointer-events-none" />
      <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-2">
        <div className="lg:hidden p-1">
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 rounded-2xl justify-between border-gray-200/70 dark:border-gray-700/70 bg-white/70 dark:bg-gray-800/70"
            onClick={() => setIsMobileTabSelectorOpen(true)}
          >
            <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
              <ActiveIcon className="h-4 w-4 shrink-0" />
              <span className="truncate">{activeTabMeta.label}</span>
              {activeCountLabel && (
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-xs font-bold',
                    activeTab === 'developer'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                  )}
                >
                  {activeCountLabel}
                </span>
              )}
              {activeLocked && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-400">
                  <Lock className="h-3 w-3" />
                  Locked
                </span>
              )}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
          </Button>
        </div>

        <div className="hidden lg:grid grid-cols-3 gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const locked = isTabLocked(tab.id, testerLocked, adminLocked);
            const countLabel = getCountLabel(tab.id, developerProgress, testerProgress);

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'flex min-h-[3.5rem] w-full min-w-0 flex-col items-start justify-center gap-1 rounded-xl px-4 py-3 text-left transition-all duration-300',
                  isActive
                    ? 'bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 text-foreground'
                    : 'text-muted-foreground hover:bg-white/70 dark:hover:bg-gray-800/60 hover:text-foreground'
                )}
              >
                <div className="flex w-full min-w-0 items-center gap-2">
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-base font-semibold">
                    {tab.label}
                  </span>
                  {countLabel && (
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-1 text-xs font-bold',
                        tab.id === 'developer'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                      )}
                    >
                      {countLabel}
                    </span>
                  )}
                  {locked && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-400">
                      <Lock className="h-3 w-3" />
                      Locked
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Drawer open={isMobileTabSelectorOpen} onOpenChange={setIsMobileTabSelectorOpen}>
        <DrawerContent className="lg:hidden rounded-t-3xl border-gray-200/70 dark:border-gray-800/70 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
          <DrawerHeader className="text-left pb-2">
            <DrawerTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              Select Section
            </DrawerTitle>
            <DrawerDescription>
              Navigate between compliance pipeline stages
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-3 max-h-[65vh] overflow-y-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const locked = isTabLocked(tab.id, testerLocked, adminLocked);
              const countLabel = getCountLabel(tab.id, developerProgress, testerProgress);

              return (
                <Button
                  key={tab.id}
                  type="button"
                  variant="ghost"
                  onClick={() => handleTabSelect(tab.id)}
                  className={cn(
                    'w-full h-auto min-h-20 rounded-3xl px-4 py-4 flex items-center justify-between',
                    isActive
                      ? 'bg-lime-400 text-gray-950 hover:bg-lime-400'
                      : 'bg-gray-100/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 hover:bg-gray-200/80 dark:hover:bg-gray-700/80'
                  )}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                        isActive
                          ? 'bg-lime-500/80 text-gray-950'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 text-left">
                      <span className="block text-lg font-semibold">{tab.label}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-2">
                        {countLabel && (
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-bold',
                              isActive
                                ? 'bg-lime-500/60 text-gray-950'
                                : tab.id === 'developer'
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                  : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                            )}
                          >
                            {countLabel}
                          </span>
                        )}
                        {locked && (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                              isActive
                                ? 'bg-gray-950/10 text-gray-950'
                                : 'border border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-400'
                            )}
                          >
                            <Lock className="h-3 w-3" />
                            Locked
                          </span>
                        )}
                      </span>
                    </span>
                  </span>
                  <span
                    className={cn(
                      'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                      isActive
                        ? 'bg-gray-950 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-100'
                    )}
                  >
                    {isActive ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-4 w-4 -rotate-90 opacity-80" />
                    )}
                  </span>
                </Button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
