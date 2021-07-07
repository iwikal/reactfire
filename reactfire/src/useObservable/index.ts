import React from 'react';
import { Observable } from 'rxjs';
import { ObservableCache } from './observableCache';
import { Resource } from '..';

const observableCache = new ObservableCache();

export function useObservable<T>(
  observable: Observable<T>,
  observableId: string
): Resource<T> {
  const entry = observableCache.getOrInsert(observableId, observable);

  const [, setResource] = React.useState(entry.resource);

  React.useEffect(() => {
    const subscription = entry.observable.subscribe(setResource);
    return () => subscription.unsubscribe();
  }, [entry.observable]);

  return entry.resource;
}
