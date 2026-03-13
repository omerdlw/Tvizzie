import { NAV_ACTION_LAYOUT, navActionClass } from './constants'

export default function ReviewAction({ reviewState }) {
  const { isSubmitting, ownComment, submitReview } = reviewState || {}

  return (
    <div className={`${NAV_ACTION_LAYOUT.row} flex-1`}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (submitReview && !isSubmitting) {
            submitReview(e)
          }
        }}
        disabled={isSubmitting}
        className={navActionClass({
          tone: 'primary',
          className: 'w-full disabled:cursor-not-allowed disabled:opacity-50',
        })}
      >
        {isSubmitting
          ? 'Saving'
          : ownComment
            ? 'Update Review'
            : 'Publish Review'}
      </button>
    </div>
  )
}
