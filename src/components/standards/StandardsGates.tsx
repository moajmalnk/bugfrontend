import CodoAcknowledgementGate from '@/components/codo/CodoAcknowledgementGate';
import CursorTipsAcknowledgementGate from '@/components/cursorTips/CursorTipsAcknowledgementGate';
import { useState } from 'react';

/**
 * Why: CODO Rules and Cursor Tips gates are both full-screen; showing them
 * together would stack two overlays. CODO (production law) runs first and the
 * Cursor Tips gate starts only once no CODO rule is pending.
 */
export default function StandardsGates() {
  const [codoCleared, setCodoCleared] = useState(false);
  return (
    <>
      <CodoAcknowledgementGate onSettledChange={setCodoCleared} />
      <CursorTipsAcknowledgementGate enabled={codoCleared} />
    </>
  );
}
