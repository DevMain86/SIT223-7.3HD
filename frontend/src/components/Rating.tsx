// Star icon plus a numeric score, shown at the foot of each PostCard.
import { Star } from "lucide-react";

interface RatingProps {
    score: number;
}

function Rating({ score }: RatingProps) {
  return (
    <span className="rating">
      <Star size={16} fill="currentColor" /> {score}
    </span>
  );
}

export default Rating;