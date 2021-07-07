export type Result<T> = Readonly<
  { success: true; value: T } | { success: false; error: any }
>;

function isPromiseLike(p: any): p is PromiseLike<unknown> {
  return typeof p === 'object' && p !== null && typeof p.then === 'function';
}

export class Resource<T> {
  result: Result<T> | undefined;
  private readonly promise: Promise<T>;

  constructor(
    executor: (
      resolve: (value: T | PromiseLike<T>) => void,
      reject: (reason?: any) => void
    ) => void
  ) {
    this.promise = new Promise<T>((res, rej) => {
      const wrappedResolve = (value: T | PromiseLike<T>): void => {
        if (this.result) return;
        if (isPromiseLike(value)) {
          value.then(wrappedResolve, wrappedReject);
          return;
        }
        this.result = { success: true, value };
        res(value);
      };

      const wrappedReject = (error: any): void => {
        if (this.result) return;
        this.result = { success: false, error };
        rej(error);
      };

      executor(wrappedResolve, wrappedReject);
    });

    // Suppress unhandled rejection check. It's ok to ignore Resource errors.
    this.promise.catch(() => {});
  }

  read(): T {
    if (!this.result) throw this.promise.catch(() => {});
    if (this.result.success) return this.result.value;
    throw this.result.error;
  }

  then<U = T, F = never>(
    onFulfill?: ((value: T) => U | PromiseLike<U>) | null,
    onReject?: ((error: any) => F | PromiseLike<F>) | null
  ): Resource<U | F> {
    /*
    const { result } = this;
    if (result) {
      return new Resource<U | F>((resolve, reject) => {
        if (result.success) {
          if (onFulfill) resolve(onFulfill(result.value));
          else resolve(result.value as unknown as U);
        } else {
          if (onReject) resolve(onReject(result.error));
          else reject(result.error);
        }
      });
    }
    */

    return Resource.resolve(this.promise.then(onFulfill, onReject));
  }

  catch<F = never>(
    onReject: ((error: any) => F | PromiseLike<F>) | null
  ): Resource<T | F> {
    return Resource.resolve(this.promise.catch(onReject));
  }

  finally(onSettle?: () => void): Resource<T> {
    return Resource.resolve(this.promise.finally(onSettle));
  }

  static resolve(): Resource<void>;
  static resolve<T>(value: T | PromiseLike<T>): Resource<T>;
  static resolve<T>(value?: T | PromiseLike<T>): Resource<T | void> {
    return new Resource(resolve => resolve(value));
  }

  static reject<T = never>(error: any): Resource<T> {
    return new Resource((_, reject) => reject(error));
  }
}
