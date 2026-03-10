import Image from 'next/image'

export default function ImagePreviewModal({ data }) {
  return (
    <Image
      src={`https://image.tmdb.org/t/p/original${data.file_path}`}
      className="object-contain"
      width={400}
      height={600}
      alt=""
    />
  )
}
