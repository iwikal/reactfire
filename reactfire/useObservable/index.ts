import * as React from 'react';
import { Observable } from 'rxjs';
import { CacheEntry, ObservableCache } from './observableCache';
import { Resource } from '..';

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
  const entry = preloadObservable(observable, observableId);

  const { result } = entry;
  const initialValue = result && result.success ? result.value : undefined;

  const [, setValue] = React.useState(initialValue);

  React.useEffect(() => {
    const subscription = entry.observable.subscribe(value => setValue(value));

    return () => subscription.unsubscribe();
  }, [observableId]);

  return entry;
}
