import React from 'react';
import { MessageCircle, Star } from 'lucide-react';
import { useFeedback } from '@/hooks/useFeedback';
import FeedbackModal from './FeedbackModal';

export default function FeedbackWidget() {
  const {
    shouldShowFeedback,
    isLoading,
    showFeedbackModal,
    hideFeedbackModal,
    isModalOpen,
    submitFeedback,
    dismissFeedback,
  } = useFeedback();

  // Don't render anything if user shouldn't see feedback or if still loading
  if (isLoading || !shouldShowFeedback) {
    return null;
  }

  return (
    <>
      {/* Floating Feedback Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={showFeedbackModal}
          className="group bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300"
          aria-label="Rate your experience"
          title="Rate your experience with BugRicer"
        >
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 group-hover:animate-pulse" />
            <span className="hidden sm:inline-block font-medium text-sm">
              Rate Us
            </span>
          </div>
          
          {/* Animated pulse effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 animate-ping opacity-20"></div>
          
          {/* Star decoration */}
          <div className="absolute -top-1 -right-1">
            <Star className="h-3 w-3 text-yellow-300 fill-current animate-pulse" />
          </div>
        </button>
      </div>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={isModalOpen}
        onClose={hideFeedbackModal}
        onSubmit={() => {
          // This will be called when feedback is successfully submitted
          // The useFeedback hook handles the actual submission
        }}
      />
    </>
  );
}
