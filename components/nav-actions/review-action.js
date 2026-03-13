import { navActionBaseClass } from './constants'

export default function ReviewAction({ reviewState }) {
  const { isSubmitting, ownComment, submitReview } = reviewState || {}

  return (
    <div className="mt-2.5 flex w-full flex-1 items-center gap-2">
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
        className={navActionBaseClass({
          layout: 'flex cursor-pointer items-center justify-center gap-2 w-full',
          className:
            'w-full bg-white text-black ring-1 ring-white/10 hover:bg-transparent hover:text-white disabled:cursor-not-allowed disabled:opacity-50',
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
