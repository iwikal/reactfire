import React from 'react';
import { Observable } from 'rxjs';
import { CacheEntry, ObservableCache } from './observableCache';
import { Resource } from '..';

const observableCache = new ObservableCache();

function preloadObservable<T>(
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

  const [resource, setResource] = React.useState(entry.resource);

  React.useEffect(() => {
    const subscription = entry.observable.subscribe(setResource);
    return () => subscription.unsubscribe();
  }, [entry.observable]);

  return resource;
}
