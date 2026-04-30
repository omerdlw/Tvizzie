export function GenreChip({ genre, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`inline-flex shrink-0 items-center  border px-4 py-2 text-[11px] tracking-wide text-black/70 transition ${isActive
          ? 'border-black bg-black font-semibold text-white'
          : 'hover:bg-primary border-black/15 bg-white/50 backdrop-blur-sm hover:text-black'
        }`}
    >
      {genre.name}
    </button>
  );
}
