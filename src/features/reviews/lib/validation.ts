import { REVIEW_MAX_LENGTH, REVIEW_MIN_LENGTH } from "./constants";

function isValidRating(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0.5 &&
    value <= 5 &&
    value * 2 === Math.trunc(value * 2)
  );
}

export function getReviewValidationError({
  allowRating = true,
  content,
  rating,
  requireText = false,
  textLabel = "review",
}: {
  allowRating?: boolean;
  content: string;
  rating: number | null;
  requireText?: boolean;
  textLabel?: "comment" | "review";
}): string | null {
  const text = content.trim();
  const label = textLabel === "comment" ? "Comment" : "Review";

  if (rating !== null && !isValidRating(rating)) return "Rating is invalid";
  if (!allowRating && rating !== null) return "Lists only support comments";
  if (requireText && !text) return "Write a comment to share your thoughts";
  if (!text && rating === null) return "Add a score or write a review";
  if (text && text.length < REVIEW_MIN_LENGTH) {
    return `${label} must be at least ${REVIEW_MIN_LENGTH} characters long`;
  }
  if (text.length > REVIEW_MAX_LENGTH) {
    return `${label} must be at most ${REVIEW_MAX_LENGTH} characters long`;
  }
  return null;
}
