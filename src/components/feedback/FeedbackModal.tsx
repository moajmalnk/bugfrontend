import React, { useState, useEffect } from 'react';
import { X, Send, MessageCircle, Star } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { toast } from '@/hooks/use-toast';
import { ENV } from '@/lib/env';
import { cn } from '@/lib/utils';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, feedbackText?: string) => Promise<void>;
}

interface FeedbackData {
  rating: number;
  feedback_text: string;
}

const RATING_LABELS = ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'];

export default function FeedbackModal({ isOpen, onClose, onSubmit }: FeedbackModalProps) {
  const { currentUser } = useAuth();
  const { theme } = useTheme();
  const [feedbackData, setFeedbackData] = useState<FeedbackData>({
    rating: 0,
    feedback_text: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);

  const maxChars = 1000;

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFeedbackData({ rating: 0, feedback_text: '' });
      setShowTextInput(false);
      setCharCount(0);
      setHoveredRating(0);
    }
  }, [isOpen]);

  const handleRatingClick = (rating: number) => {
    setFeedbackData(prev => ({ ...prev, rating }));
    
    // Show text input after rating is selected
    if (!showTextInput) {
      setShowTextInput(true);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (text.length <= maxChars) {
      setFeedbackData(prev => ({ ...prev, feedback_text: text }));
      setCharCount(text.length);
    }
  };

  const handleSubmit = async () => {
    if (feedbackData.rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a rating before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(feedbackData.rating, feedbackData.feedback_text.trim() || undefined);
      onClose();
    } catch (error) {
      console.error('Feedback submission error:', error);
      // Error handling is done in the parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with blur effect */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-lg mx-4">
        <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-300">
          {/* Gradient Accent Bar */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-blue-500" />
          
          {/* Header Section */}
          <div className="relative p-6 pb-4 bg-gradient-to-br from-card via-card to-muted/20">
            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-2 hover:bg-accent rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label="Close feedback modal"
            >
              <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
            </button>
            
            {/* Header Content */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground tracking-tight">
                  Rate Your Experience
                </h2>
                <p className="text-muted-foreground font-medium">
                  Help us improve BugRicer
                </p>
              </div>
            </div>
          </div>

          {/* Rating Section */}
          <div className="px-6 pb-6">
            <div className="text-center mb-8">
              <p className="text-foreground text-lg font-medium mb-6">
                How would you rate your overall experience with BugRicer?
              </p>
              
              {/* Star Rating System */}
              <div className="flex justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((rating) => {
                  const isSelected = feedbackData.rating >= rating;
                  const isHovered = hoveredRating >= rating;
                  const isActive = isSelected || isHovered;
                  
                  return (
                    <button
                      key={rating}
                      onClick={() => handleRatingClick(rating)}
                      onMouseEnter={() => setHoveredRating(rating)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className={cn(
                        "w-12 h-12 rounded-xl transition-all duration-200 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                        isActive
                          ? "bg-gradient-to-br from-primary to-blue-600 shadow-lg scale-110"
                          : "bg-muted hover:bg-accent"
                      )}
                      aria-label={RATING_LABELS[rating - 1]}
                      title={RATING_LABELS[rating - 1]}
                    >
                      <Star
                        className={cn(
                          "h-6 w-6 mx-auto transition-colors duration-200",
                          isActive ? "text-white fill-white" : "text-muted-foreground"
                        )}
                      />
                    </button>
                  );
                })}
              </div>
              
              {feedbackData.rating > 0 && (
                <div className="animate-in fade-in-0 slide-in-from-top-2 duration-300">
                  <p className="text-primary font-semibold text-lg">
                    {RATING_LABELS[feedbackData.rating - 1]}
                  </p>
                </div>
              )}
            </div>

            {/* Text Feedback Section */}
            {showTextInput && (
              <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      How can we improve your experience? 
                      <span className="text-muted-foreground font-normal ml-1">(Optional)</span>
                    </label>
                    <textarea
                      value={feedbackData.feedback_text}
                      onChange={handleTextChange}
                      placeholder="Share your thoughts, suggestions, or report any issues..."
                      className="w-full h-28 px-4 py-3 border border-input bg-background rounded-xl resize-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200 text-foreground placeholder:text-muted-foreground"
                      maxLength={maxChars}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-muted-foreground">
                        Your feedback helps us improve
                      </span>
                      <span className={cn(
                        "text-xs font-medium transition-colors",
                        charCount > maxChars * 0.9 ? "text-destructive" : "text-muted-foreground"
                      )}>
                        {charCount}/{maxChars}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-6 bg-muted/30 border-t border-border">
            <div className="flex gap-3 mb-4">
              <button
                onClick={handleDismiss}
                className="flex-1 px-6 py-3 text-muted-foreground bg-background border border-border rounded-xl hover:bg-accent hover:text-accent-foreground transition-all duration-200 font-semibold focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                Maybe Later
              </button>
              <button
                onClick={handleSubmit}
                disabled={feedbackData.rating === 0 || isSubmitting}
                className={cn(
                  "flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  feedbackData.rating === 0 || isSubmitting
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-gradient-to-r from-primary to-blue-600 text-white hover:from-primary/90 hover:to-blue-600/90 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                )}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Feedback
                  </>
                )}
              </button>
            </div>
            
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              Your feedback is anonymous and helps us make BugRicer better for everyone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
