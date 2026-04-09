export default function AuthPageShell({ children }) {
  return (
    <main className="flex min-h-screen w-screen items-center justify-center bg-[var(--color-background)] px-4 pt-6 pb-28">
      <section className="w-full max-w-xl">{children}</section>
    </main>
  );
}
