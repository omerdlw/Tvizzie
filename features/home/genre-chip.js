export function GenreChip({ genre, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-[11px] font-semibold tracking-wide text-black/72 transition ${
        isActive ? 'border-black bg-black text-white' : 'border-black/10 bg-white hover:border-black/20 hover:bg-black/5'
      }`}
    >
      {genre.name}
    </button>
  );
}
