export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          LendLoop
        </h1>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400 sm:text-xl">
          Borrow what you need. Lend what you don&apos;t.
        </p>
        <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-500">
          Neighborhood tool lending platform placeholder.
        </p>
      </div>
    </main>
  );
}
