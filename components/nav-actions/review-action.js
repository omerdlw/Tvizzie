export default function ReviewAction({ reviewState }) {
  const { isSubmitting, ownComment, submitReview } = reviewState || {}

  return (
    <div className="mt-2.5 flex w-full flex-1 items-center gap-2">
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (submitReview && !isSubmitting) {
            submitReview(e)
          }
        }}
        disabled={isSubmitting}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[20px] bg-white px-4 py-2.5 text-[11px] font-semibold tracking-widest text-black uppercase ring-1 ring-white/10 transition-all duration-300 hover:bg-transparent hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting
          ? 'Saving...'
          : ownComment
            ? 'Update Review'
            : 'Publish Review'}
      </button>
    </div>
  )
}
