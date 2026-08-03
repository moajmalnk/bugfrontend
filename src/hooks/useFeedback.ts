import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  feedbackService,
  FEEDBACK_ENGAGE_MS,
  getOrCreateFeedbackSessionStart,
  clearFeedbackSessionStart,
} from '@/services/feedbackService';
import { toast } from '@/hooks/use-toast';

export interface UseFeedbackReturn {
  shouldShowFeedback: boolean;
  isLoading: boolean;
  showFeedbackModal: () => void;
  hideFeedbackModal: () => void;
  isModalOpen: boolean;
  submitFeedback: (rating: number, feedbackText?: string) => Promise<void>;
  dismissFeedback: () => Promise<void>;
}

/**
 * Feedback prompt rules:
 * - Logged-in users only
 * - Auto-show after 5 minutes of use in this login session
 * - After Submit → never show again
 * - After Maybe Later → show again only after 1 week
 */
export function useFeedback(): UseFeedbackReturn {
  const { isAuthenticated, currentUser } = useAuth();
  const [eligible, setEligible] = useState(false);
  const [engagementReady, setEngagementReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const hasAutoOpened = useRef(false);

  const shouldShowFeedback = eligible && engagementReady;

  const resetPrompt = useCallback(() => {
    setEligible(false);
    setEngagementReady(false);
    setIsModalOpen(false);
    hasAutoOpened.current = false;
  }, []);

  const checkFeedbackStatus = useCallback(async () => {
    if (!isAuthenticated || !currentUser) {
      resetPrompt();
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const shouldShow = await feedbackService.shouldShowFeedback();
      setEligible(shouldShow);
    } catch {
      setEligible(false);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, currentUser, resetPrompt]);

  useEffect(() => {
    void checkFeedbackStatus();
  }, [checkFeedbackStatus]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearFeedbackSessionStart();
      resetPrompt();
    }
  }, [isAuthenticated, resetPrompt]);

  // 5-minute engagement gate after login for this browser session
  useEffect(() => {
    if (!isAuthenticated || !currentUser || !eligible) {
      setEngagementReady(false);
      return;
    }

    const startedAt = getOrCreateFeedbackSessionStart();
    const remaining = FEEDBACK_ENGAGE_MS - (Date.now() - startedAt);

    if (remaining <= 0) {
      setEngagementReady(true);
      return;
    }

    setEngagementReady(false);
    const timer = window.setTimeout(() => {
      setEngagementReady(true);
    }, remaining);

    return () => window.clearTimeout(timer);
  }, [isAuthenticated, currentUser, eligible]);

  // Auto-open modal once when eligible + 5 minutes elapsed
  useEffect(() => {
    if (shouldShowFeedback && !isModalOpen && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      setIsModalOpen(true);
    }
  }, [shouldShowFeedback, isModalOpen]);

  const showFeedbackModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const hideFeedbackModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const submitFeedback = useCallback(
    async (rating: number, feedbackText?: string) => {
      try {
        await feedbackService.submitFeedback(rating, feedbackText);
        feedbackService.markFeedbackAsSubmitted();
        resetPrompt();

        toast({
          title: 'Thank You!',
          description: 'Your feedback has been submitted successfully.',
        });
      } catch (error) {
        toast({
          title: 'Submission Failed',
          description:
            error instanceof Error
              ? error.message
              : 'Failed to submit feedback. Please try again.',
          variant: 'destructive',
        });
        throw error;
      }
    },
    [resetPrompt]
  );

  const dismissFeedback = useCallback(async () => {
    try {
      await feedbackService.dismissFeedback();
      feedbackService.markFeedbackDismissed();
      resetPrompt();
    } catch (error) {
      if (error instanceof Error && error.message.includes('already been submitted')) {
        feedbackService.markFeedbackAsSubmitted();
        resetPrompt();
        return;
      }

      feedbackService.markFeedbackDismissed();
      resetPrompt();

      toast({
        title: 'Maybe later',
        description: "We'll ask again in about a week.",
      });
    }
  }, [resetPrompt]);

  return {
    shouldShowFeedback,
    isLoading,
    showFeedbackModal,
    hideFeedbackModal,
    isModalOpen,
    submitFeedback,
    dismissFeedback,
  };
}
