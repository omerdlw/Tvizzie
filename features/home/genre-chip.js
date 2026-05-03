export function GenreChip({ genre, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`inline-flex min-h-10 shrink-0 items-center rounded border px-4 py-2 text-xs font-semibold tracking-wide transition ${
        isActive
          ? 'border-white bg-white font-semibold text-black'
          : 'border-grid-line bg-primary text-white-soft backdrop-blur-sm hover:text-white'
      }`}
    >
      {genre.name}
    </button>
  );
}
