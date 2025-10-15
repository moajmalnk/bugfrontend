import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { feedbackService, FeedbackStatus } from '@/services/feedbackService';
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

export function useFeedback(): UseFeedbackReturn {
  const { isAuthenticated, currentUser } = useAuth();
  const [shouldShowFeedback, setShouldShowFeedback] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Check if user should see feedback prompt
  const checkFeedbackStatus = useCallback(async () => {
    if (!isAuthenticated || !currentUser) {
      setShouldShowFeedback(false);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const shouldShow = await feedbackService.shouldShowFeedback();
      setShouldShowFeedback(shouldShow);
    } catch (error) {
      console.error('Error checking feedback status:', error);
      setShouldShowFeedback(false);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, currentUser]);

  // Initial check when component mounts or user changes
  useEffect(() => {
    checkFeedbackStatus();
  }, [checkFeedbackStatus]);

  // Refresh feedback status when user changes
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      checkFeedbackStatus();
    } else if (!isAuthenticated) {
      // Clear feedback status when user logs out
      setShouldShowFeedback(false);
      setIsModalOpen(false);
    }
  }, [isAuthenticated, currentUser, checkFeedbackStatus]);

  // Auto-show feedback modal after a delay if user should see it
  useEffect(() => {
    if (shouldShowFeedback && !isModalOpen) {
      // Show feedback after 30 seconds of being on the app
      const timer = setTimeout(() => {
        setIsModalOpen(true);
      }, 30000); // 30 seconds delay

      return () => clearTimeout(timer);
    }
  }, [shouldShowFeedback, isModalOpen]);

  const showFeedbackModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const hideFeedbackModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const submitFeedback = useCallback(async (rating: number, feedbackText?: string) => {
    try {
      await feedbackService.submitFeedback(rating, feedbackText);
      feedbackService.markFeedbackAsSubmitted();
      setShouldShowFeedback(false);
      setIsModalOpen(false);
      
      toast({
        title: "Thank You!",
        description: "Your feedback has been submitted successfully.",
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  }, []);

  const dismissFeedback = useCallback(async () => {
    try {
      await feedbackService.dismissFeedback();
      setIsModalOpen(false);
      // Don't set shouldShowFeedback to false here, as user might want to submit later
    } catch (error) {
      console.error('Error dismissing feedback:', error);
      // Still close modal even if dismiss fails
      setIsModalOpen(false);
    }
  }, []);

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
