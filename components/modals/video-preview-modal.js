export default function VideoPreviewModal({ data }) {
  if (!data?.key) return null

  return (
    <div className="relative w-[min(92vw,1200px)] max-h-[85vh] overflow-hidden rounded-[24px] bg-black">
      <div className="relative aspect-video h-auto w-full">
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          src={`https://www.youtube.com/embed/${data.key}?autoplay=1`}
          className="absolute inset-0 h-full w-full"
          title={data.name}
          allowFullScreen
        />
      </div>
    </div>
  )
}
