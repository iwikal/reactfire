/**
 * A simple wrapper for deferring a suspense until you actually need the data.
 */
export interface Resource<T> {
  /**
   * Calling this may suspend, or throw an error if fetching the resource
   * failed.
   */
  read(): T;
}

/**
 * A higher order function that produces a function that will wrap the return
 * value in a Resource, catching suspenses and errors and deferring them until
 * you call Resource.read.
 *
 * This makes it easier to have more concurrent requests, and avoid unnecessary
 * waterfalls caused by suspending to eagerly.
 */
export function resourcify<A extends any[], T>(func: (...args: A) => T) {
  return function(...args: A): Resource<T> {
    try {
      const t = func(...args);
      return {
        read() {
          return t;
        }
      };
    } catch (err) {
      return {
        read() {
          throw err;
        }
      };
    }
  };
}
