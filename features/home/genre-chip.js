export function GenreChip({ genre, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`inline-flex h-9 shrink-0 items-center justify-center border px-5 text-[10px] font-bold tracking-widest whitespace-nowrap uppercase sm:text-xs ${
        isActive
          ? 'border-white bg-white text-black'
          : 'border-white/10 bg-white/10 text-white/50 hover:bg-white/10 hover:text-white'
      }`}
    >
      {genre.name}
    </button>
  );
}
