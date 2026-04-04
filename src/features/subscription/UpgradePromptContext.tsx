import { PropsWithChildren, createContext, useContext, useMemo, useState } from 'react';

import { UpgradeModal } from '../../components/UpgradeModal';
import { UpgradeTrigger } from './subscriptionTypes';

interface UpgradePromptContextValue {
  showUpgradePrompt: (trigger: UpgradeTrigger) => void;
  hideUpgradePrompt: () => void;
}

const UpgradePromptContext = createContext<UpgradePromptContextValue | undefined>(undefined);

export function UpgradePromptProvider({ children }: PropsWithChildren) {
  const [activeTrigger, setActiveTrigger] = useState<UpgradeTrigger | null>(null);

  const value = useMemo(
    () => ({
      showUpgradePrompt: (trigger: UpgradeTrigger) => {
        setActiveTrigger(trigger);
      },
      hideUpgradePrompt: () => {
        setActiveTrigger(null);
      },
    }),
    [],
  );

  return (
    <UpgradePromptContext.Provider value={value}>
      {children}
      {activeTrigger ? (
        <UpgradeModal
          trigger={activeTrigger}
          onClose={() => {
            setActiveTrigger(null);
          }}
        />
      ) : null}
    </UpgradePromptContext.Provider>
  );
}

export const useUpgradePrompt = () => {
  const context = useContext(UpgradePromptContext);

  if (!context) {
    throw new Error('useUpgradePrompt must be used inside UpgradePromptProvider.');
  }

  return context;
};
