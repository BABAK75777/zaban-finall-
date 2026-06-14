/**
 * In-flight dedup: one fetch per sentenceId until settled (Step C).
 */

export class InFlightTtsFetch<T> {
  private readonly inflight = new Map<string, Promise<T>>();

  getOrFetch(sentenceId: string, factory: () => Promise<T>): Promise<T> {
    const existing = this.inflight.get(sentenceId);
    if (existing) {
      return existing;
    }

    const promise = factory().finally(() => {
      this.inflight.delete(sentenceId);
    });
    this.inflight.set(sentenceId, promise);
    return promise;
  }

  hasInFlight(sentenceId: string): boolean {
    return this.inflight.has(sentenceId);
  }
}
