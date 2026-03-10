export default function VideoPreviewModal({ data }) {
  if (!data?.key) return null

  return (
    <div className="relative aspect-video w-5xl overflow-hidden">
      <iframe
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        src={`https://www.youtube.com/embed/${data.key}?autoplay=1`}
        className="absolute inset-0 h-full w-full"
        title={data.name}
        allowFullScreen
      />
    </div>
  )
}
