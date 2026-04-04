export function getLikesLabel(likesCount) {
  if (likesCount === 0) return 'No likes yet';
  if (likesCount === 1) return '1 like';
  return `${likesCount} likes`;
}

export function getRatingStats(reviews) {
  const ratedReviews = reviews.filter((review) => Number.isFinite(review.rating));

  if (ratedReviews.length === 0) {
    return { average: null, count: 0 };
  }

  const total = ratedReviews.reduce((sum, review) => {
    const value = Number(review.rating);
    return sum + (value > 5 ? value / 2 : value);
  }, 0);

  return {
    average: (total / ratedReviews.length).toFixed(1),
    count: ratedReviews.length,
  };
}

export function sortReviews(reviews, currentUserId) {
  return [...reviews].sort((first, second) => {
    if (first.user?.id === currentUserId) return -1;
    if (second.user?.id === currentUserId) return 1;

    const firstLikes = first.likes?.length || 0;
    const secondLikes = second.likes?.length || 0;

    if (firstLikes !== secondLikes) {
      return secondLikes - firstLikes;
    }

    const firstTime = new Date(first.updatedAt || first.createdAt || 0).getTime();
    const secondTime = new Date(second.updatedAt || second.createdAt || 0).getTime();

    return secondTime - firstTime;
  });
}

export function mergeReviewUser(review, userProfile) {
  if (!userProfile) {
    return review;
  }

  return {
    ...review,
    user: {
      ...review.user,
      displayName: userProfile.displayName || review.user?.displayName || review.user?.name,
      username: userProfile.username || review.user?.username,
      avatarUrl: userProfile.avatarUrl || review.user?.avatarUrl,
    },
  };
}
