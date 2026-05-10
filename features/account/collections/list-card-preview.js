import Icon from '@/ui/icon';
import { getPosterMetrics, getPreviewImage, POSTER_HEIGHT, POSTER_WIDTH } from './list-card-utils';

function PreviewPoster({ index, item, total }) {
  const imageSrc = getPreviewImage(item);
  const { brightness, rotate, scale, x, y, zIndex, saturate, blur } = getPosterMetrics(index, total);

  return (
    <div
      className="absolute top-0 left-1/2"
      style={{
        zIndex,
        transform: `translateX(calc(-50% + ${x}px)) translateY(${y}px) rotate(${rotate}deg) scale(${scale})`,
      }}
    >
      <div
        className="overflow-hidden"
        style={{
          height: `${POSTER_HEIGHT}px`,
          width: `${POSTER_WIDTH}px`,
        }}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={item.title || item.name || 'Poster'}
            className="h-full w-full object-cover"
            style={{
              filter: `brightness(${brightness}) contrast(1.08) saturate(${saturate}) blur(${blur}px)`,
            }}
          />
        ) : (
          <div className="center h-full w-full bg-black/50 text-white/50">
            <Icon icon="solar:videocamera-record-bold" size={20} />
          </div>
        )}
      </div>
    </div>
  );
}

function PlaceholderPoster({ index, total }) {
  const { rotate, scale, x, y, zIndex } = getPosterMetrics(index, total);

  return (
    <div
      className="absolute top-0 left-1/2"
      style={{
        zIndex,
        transform: `translateX(calc(-50% + ${x}px)) translateY(${y}px) rotate(${rotate}deg) scale(${scale})`,
      }}
    >
      <div
        className="border border-white/10 bg-black"
        style={{
          height: `${POSTER_HEIGHT}px`,
          width: `${POSTER_WIDTH}px`,
        }}
      />
    </div>
  );
}

export default function ListCardPreviewStack({ previewSlots }) {
  return (
    <div
      className="absolute inset-0"
      style={{
        transformOrigin: 'center bottom',
        transformStyle: 'flat',
      }}
    >
      {previewSlots.map((item, index) =>
        item ? (
          <PreviewPoster
            key={item.mediaKey || `${item.entityType}-${item.entityId}-${index}`}
            index={index}
            item={item}
            total={previewSlots.length}
          />
        ) : (
          <PlaceholderPoster key={`placeholder-${index}`} index={index} total={previewSlots.length} />
        )
      )}
    </div>
  );
}
