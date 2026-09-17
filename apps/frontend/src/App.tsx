import { ScreenerTable } from "@/components/screener/ScreenerTable";
import { useScreener } from "@/hooks/useScreener";

function App() {
  const { data, isLoading, isError, error } = useScreener();

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background p-6 text-foreground">
        Loading markets...
      </main>
    );
  }

  if (isError) {
    return (
      <main className="min-h-screen bg-background p-6 text-foreground">
        <p className="text-destructive">
          {error instanceof Error ? error.message : "Failed to load screener"}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">Perp Screener</h1>

            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Live
            </div>
          </div>

          <span className="text-sm text-muted-foreground">
            {data?.data.length ?? 0} candidates
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-[1600px] p-6">
        <ScreenerTable data={data?.data ?? []} />
      </section>
    </main>
  );
}

export default App;
