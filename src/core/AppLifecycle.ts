export interface RuntimeApp {
  start(): Promise<void>;
  dispose(): void;
}

/** Only the current page instance may report a startup failure. */
export class AppLifecycle {
  private current: RuntimeApp | null = null;
  private generation = 0;

  constructor(private readonly onError: (error: unknown) => void) {}

  launch(create: () => RuntimeApp): void {
    this.dispose();
    const generation = this.generation;
    try {
      const app = create();
      this.current = app;
      void app.start().catch(error => {
        if (generation !== this.generation || this.current !== app) return;
        this.dispose();
        this.onError(error);
      });
    } catch (error) {
      if (generation !== this.generation) return;
      this.dispose();
      this.onError(error);
    }
  }

  dispose(): void {
    this.generation++;
    const app = this.current;
    this.current = null;
    app?.dispose();
  }
}
