export class Locker {
  private promise: Promise<void> = Promise.resolve();
  private resolve: () => void = () => {};

  constructor() {
    this.lock();
  }
  lock() {
    this.promise = new Promise((resolve) => {
      this.resolve = resolve;
    });
  }
  unLock() {
    this.resolve();
  }
  wait() {
    return this.promise;
  }
}

export const debounce = (() => {
  const cache = new Map<string, ReturnType<typeof setTimeout>>();
  return (key: string, func: () => void, delay: number) => {
    const timeout = cache.get(key);
    if (timeout != undefined) {
      clearTimeout(timeout);
    }
    cache.set(
      key,
      setTimeout(async () => {
        try {
          await func();
        } catch (error) {
          console.error(error);
        }
      }, delay)
    );
  };
})();
