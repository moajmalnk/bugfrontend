import { CodoRuleBody } from '@/components/codo/CodoRuleBody';
import { StandardsAcknowledgementGate } from '@/components/standards/StandardsAcknowledgementGate';
import { useAuth } from '@/context/AuthContext';
import { getStandardsMode, userHasPendingOnboarding } from '@/lib/utils';
import {
  acknowledgeCodoRule,
  fetchPendingCodoAcknowledgements,
  type CodoCommonRule,
} from '@/services/codoRulesService';

const PHASE_LABEL: Record<string, string> = {
  developer: 'Developer',
  tester: 'Tester / QA',
  project: 'Project',
};

const fetchPendingRules = () =>
  fetchPendingCodoAcknowledgements().then((data) => ({
    items: data.rules,
    total: data.total_pending,
  }));

/**
 * Why: a person whose CODO Rules access is Required (the default for
 * developers and CODO testers) must answer every active rule for their role
 * before the dashboard is usable. Optional / Hidden users are never gated.
 */
export default function CodoAcknowledgementGate({
  onSettledChange,
}: {
  onSettledChange?: (cleared: boolean) => void;
}) {
  const { currentUser } = useAuth();
  const enabled =
    !!currentUser &&
    getStandardsMode(currentUser, 'codo') === 'required' &&
    !userHasPendingOnboarding(currentUser);

  return (
    <StandardsAcknowledgementGate<CodoCommonRule>
      enabled={enabled}
      storagePrefix="codo_ack_cleared"
      fetchPending={fetchPendingRules}
      acknowledge={acknowledgeCodoRule}
      eyebrow="Common CODO"
      title="Acknowledge each rule"
      intro="Read the standard, then record your response. The dashboard opens after every required rule has a response."
      itemNoun="rule"
      acknowledgeLabel="I acknowledge this rule"
      loadErrorTitle="Rules could not be loaded"
      onSettledChange={onSettledChange}
      renderBadge={(rule) => (
        <span className="inline-flex items-center rounded-xl border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
          {PHASE_LABEL[rule.phase] || rule.phase}
        </span>
      )}
      renderItem={(rule) => (
        <>
          <h2 className="text-lg font-semibold text-foreground">
            {rule.subtitle?.trim() ? `${rule.subtitle}: ${rule.title}` : rule.title}
          </h2>
          <CodoRuleBody
            hideHeading
            ruleKey={rule.rule_key}
            subtitle={rule.subtitle}
            title={rule.title}
            description={rule.description}
          />
        </>
      )}
    />
  );
}
