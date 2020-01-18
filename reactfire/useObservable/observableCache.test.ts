import { ObservableCache } from './observableCache';
import { Observable, Subject, BehaviorSubject, throwError } from 'rxjs';

jest.useFakeTimers();

describe('ObservableCache', () => {
  it('deduplicates observables', async () => {
    const cache = new ObservableCache();
    expect(cache.activeObservables.size).toBe(0);

    cache.createDedupedObservable(() => new Subject(), 'foo');
    expect(cache.activeObservables.size).toBe(1);

    cache.createDedupedObservable(() => new Subject(), 'foo');
    expect(cache.activeObservables.size).toBe(1);

    cache.createDedupedObservable(() => new Subject(), 'bar');
    expect(cache.activeObservables.size).toBe(2);
  });

  describe('CacheEntry', () => {
    it('removes itself after resolving', async () => {
      const cache = new ObservableCache();
      cache.createDedupedObservable(() => new BehaviorSubject(0), 'id');

      expect(cache.activeObservables.size).toBe(1);

      jest.runAllTimers();

      expect(cache.activeObservables.size).toBe(0);
    });

    it('stays as long as someone is subscribed', async () => {
      const cache = new ObservableCache();

      const subject = new BehaviorSubject(42);
      const entry = cache.createDedupedObservable(() => subject, 'id');

      expect(entry.read()).toBe(42);
      expect(cache.activeObservables.size).toBe(1);

      const subscription = entry.observable.subscribe();

      jest.runAllTimers();

      expect(cache.activeObservables.size).toBe(1);

      subscription.unsubscribe();
      expect(cache.activeObservables.size).toBe(0);
    });

    describe('.read()', () => {
      it('throws a promise at first', async () => {
        const cache = new ObservableCache();

        const subject = new Subject<number>();
        const entry = cache.createDedupedObservable(() => subject, 'id');

        expect(entry.read).toThrow(Promise);
      });

      it('returns values', async () => {
        const cache = new ObservableCache();

        const subject = new BehaviorSubject(8);
        const entry = cache.createDedupedObservable(() => subject, 'id');

        expect(entry.read()).toBe(8);

        subject.next(9);
        expect(entry.read()).toBe(9);
      });

      it('throws errors', async () => {
        const cache = new ObservableCache();

        const subject = new BehaviorSubject(8);
        const entry = cache.createDedupedObservable(() => subject, 'id');

        expect(entry.read()).toBe(8);

        expect(cache.activeObservables.size).toBe(1);

        subject.error(new Error('hello'));
        expect(entry.read).toThrowError();

        expect(cache.activeObservables.size).toBe(0);
      });
    });

    it('only subscribes once to the source', async () => {
      const cache = new ObservableCache();

      const subject = new BehaviorSubject(8);
      let count = 0;

      const entry = cache.createDedupedObservable(
        () =>
          new Observable(subscriber => {
            count++;
            return subject.subscribe(subscriber);
          }),
        'id'
      );

      entry.observable.subscribe();
      entry.observable.subscribe();

      expect(count).toBe(1);
    });
  });
});
