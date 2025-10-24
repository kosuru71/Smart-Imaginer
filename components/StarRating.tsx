import React, { useState } from 'react';
import { StarIcon } from './IconComponents';

interface StarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
  disabled?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({ rating, onRatingChange, disabled = false }) => {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex items-center justify-center space-x-1">
      {[1, 2, 3, 4, 5].map((starIndex) => (
        <button
          key={starIndex}
          onClick={() => !disabled && onRatingChange(starIndex)}
          onMouseEnter={() => !disabled && setHoverRating(starIndex)}
          onMouseLeave={() => !disabled && setHoverRating(0)}
          className={`cursor-pointer transition-colors duration-200 ${disabled ? 'cursor-not-allowed' : ''}`}
          aria-label={`Rate ${starIndex} star${starIndex > 1 ? 's' : ''}`}
          disabled={disabled}
        >
          <StarIcon
            className={`w-8 h-8 ${
              (hoverRating || rating) >= starIndex
                ? 'text-yellow-400'
                : 'text-gray-500'
            }`}
            filled={(hoverRating || rating) >= starIndex}
          />
        </button>
      ))}
    </div>
  );
};
