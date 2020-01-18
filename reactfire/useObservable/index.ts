import * as React from 'react';
import { Observable } from 'rxjs';
import { CacheEntry, ObservableCache } from './observableCache';
import { Resource, resourcify } from '..';

export { preloadRequest, usePreloadedRequest } from './requestCache';

const observableCache = new ObservableCache();

// Starts listening to an Observable.
// Call this once you know you're going to render a
// child that will consume the observable
export function preloadObservable<T>(
  observable: Observable<T>,
  observableId: string
): CacheEntry<T> {
  return observableCache.createDedupedObservable(
    () => observable,
    observableId
  );
}

export function useObservable<T>(
  observable: Observable<T>,
  observableId: string
): Resource<T> {
  return resourcify(() => {
    const entry = preloadObservable(observable, observableId);
    const value = entry.read();

    const [, setValue] = React.useState(value);

    React.useEffect(() => {
      const subscription = entry.observable.subscribe(
        value => setValue(value),
        err => {
          throw err;
        }
      );

      return () => subscription.unsubscribe();
    }, [observableId]);

    return value;
  })();
}
