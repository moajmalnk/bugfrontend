import { useCallback, useEffect, useState } from 'react';
import { translateToMalayalam } from '@/lib/malayalamUtils';

export function useMalayalamToggle(text: string) {
  const [showMalayalam, setShowMalayalam] = useState(false);
  const [malayalamText, setMalayalamText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setShowMalayalam(false);
    setMalayalamText(null);
    setLoading(false);
  }, [text]);

  const toggle = useCallback(async () => {
    if (showMalayalam) {
      setShowMalayalam(false);
      return;
    }

    if (malayalamText) {
      setShowMalayalam(true);
      return;
    }

    setLoading(true);
    try {
      const translated = await translateToMalayalam(text);
      setMalayalamText(translated);
      setShowMalayalam(true);
    } catch {
      setMalayalamText(text);
      setShowMalayalam(true);
    } finally {
      setLoading(false);
    }
  }, [showMalayalam, malayalamText, text]);

  const displayText =
    loading ? '…' : showMalayalam && malayalamText ? malayalamText : text;

  return { showMalayalam, loading, displayText, toggle };
}
