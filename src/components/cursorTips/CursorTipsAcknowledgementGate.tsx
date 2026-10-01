import { CursorTipBody } from '@/components/cursorTips/CursorTipBody';
import { StandardsAcknowledgementGate } from '@/components/standards/StandardsAcknowledgementGate';
import { useAuth } from '@/context/AuthContext';
import { getStandardsMode, userHasPendingOnboarding } from '@/lib/utils';
import {
  acknowledgeCursorTip,
  fetchPendingCursorTipAcknowledgements,
  type CursorTip,
  type CursorTipPhase,
} from '@/services/cursorTipsService';

const PHASE_LABEL: Record<CursorTipPhase, string> = {
  modes: 'Modes',
  commands: 'Commands',
  skills: 'Skills',
  workflow: 'Workflow',
  review: 'Review',
};

const fetchPendingTips = () =>
  fetchPendingCursorTipAcknowledgements().then((data) => ({
    items: data.tips,
    total: data.total_pending,
  }));

/**
 * Why: Cursor Tips are optional reading by default. When an admin sets a
 * person's Cursor Tips access to Required, they answer every active tip once
 * (after the CODO rules) before the dashboard opens; new tips surface later.
 */
export default function CursorTipsAcknowledgementGate({ enabled: allowed }: { enabled: boolean }) {
  const { currentUser } = useAuth();
  const enabled =
    allowed &&
    !!currentUser &&
    getStandardsMode(currentUser, 'cursor_tips') === 'required' &&
    !userHasPendingOnboarding(currentUser);

  return (
    <StandardsAcknowledgementGate<CursorTip>
      enabled={enabled}
      storagePrefix="cursor_tips_ack_cleared"
      fetchPending={fetchPendingTips}
      acknowledge={acknowledgeCursorTip}
      eyebrow="Cursor Tips"
      title="Read each Cursor tip"
      intro="Your admin has made Cursor Tips required for your account. Read each tip and record your response; the dashboard opens after every tip has a response."
      itemNoun="tip"
      acknowledgeLabel="I've read this tip"
      loadErrorTitle="Tips could not be loaded"
      renderBadge={(tip) => (
        <span className="inline-flex items-center rounded-xl border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
          {PHASE_LABEL[tip.phase] || tip.phase}
        </span>
      )}
      renderItem={(tip) => (
        <CursorTipBody
          tipKey={tip.tip_key}
          subtitle={tip.subtitle}
          title={tip.title}
          description={tip.description}
          analogyEn={tip.analogy_en}
          analogyMl={tip.analogy_ml}
          whenToUse={tip.when_to_use}
          whenNotToUse={tip.when_not_to_use}
          exampleBad={tip.example_bad}
          exampleGood={tip.example_good}
          exampleLanguage={tip.example_language}
        />
      )}
    />
  );
}
