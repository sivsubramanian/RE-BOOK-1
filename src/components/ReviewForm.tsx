/**
 * ReviewForm – Star rating + comment submission for completed transactions
 */
import { useState } from "react";
import { Star, Loader2, Send } from "lucide-react";

interface ReviewFormProps {
  onSubmit: (rating: number, comment: string) => Promise<boolean>;
}

const ReviewForm = ({ onSubmit }: ReviewFormProps) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    const ok = await onSubmit(rating, comment);
    setSubmitting(false);
    if (ok) setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="glass-card p-4 rounded-xl text-center">
        <p className="text-sm text-primary font-medium">Thank you for your review!</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 rounded-xl space-y-3">
      <p className="text-xs font-medium text-foreground">Leave a Review</p>

      {/* Star selector */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setRating(s)}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`w-6 h-6 transition-colors ${
                s <= (hover || rating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground"
              }`}
            />
          </button>
        ))}
      </div>

      {/* Comment */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your experience... (optional)"
        rows={2}
        className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-foreground text-sm outline-none focus:border-primary/50 resize-none placeholder:text-muted-foreground"
      />

      <button
        onClick={handleSubmit}
        disabled={rating === 0 || submitting}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors text-xs font-medium disabled:opacity-50"
      >
        {submitting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Send className="w-3.5 h-3.5" />
        )}
        Submit Review
      </button>
    </div>
  );
};

export default ReviewForm;
