import { ObservableCache } from './observableCache';
import { Observable, Subject, BehaviorSubject } from 'rxjs';

jest.useFakeTimers();

describe('ObservableCache', () => {
  it('deduplicates observables', async () => {
    const cache = new ObservableCache();
    expect(cache.activeObservables.size).toBe(0);

    cache.getOrInsert('foo', new Subject());
    expect(cache.activeObservables.size).toBe(1);

    cache.getOrInsert('foo', new Subject());
    expect(cache.activeObservables.size).toBe(1);

    cache.getOrInsert('bar', new Subject());
    expect(cache.activeObservables.size).toBe(2);
  });

  describe('CacheEntry', () => {
    it('removes itself after resolving', async () => {
      const cache = new ObservableCache();
      cache.getOrInsert('id', new BehaviorSubject(0));

      expect(cache.activeObservables.size).toBe(1);

      jest.runAllTimers();

      expect(cache.activeObservables.size).toBe(0);
    });

    it('stays around until one second after first value', async () => {
      const cache = new ObservableCache();

      const subject = new Subject();
      cache.getOrInsert('id', subject);

      expect(cache.activeObservables.size).toBe(1);
      jest.runAllTimers();
      expect(cache.activeObservables.size).toBe(1);
      subject.next(99);
      expect(cache.activeObservables.size).toBe(1);
      jest.runAllTimers();
      expect(cache.activeObservables.size).toBe(0);
    });

    it('stays as long as someone is subscribed', async () => {
      const cache = new ObservableCache();

      const subject = new Subject();
      const entry = cache.getOrInsert('id', subject);

      expect(cache.activeObservables.size).toBe(1);
      jest.runAllTimers();
      expect(cache.activeObservables.size).toBe(1);
      subject.next(99);
      expect(cache.activeObservables.size).toBe(1);

      const subscription = entry.observable.subscribe();

      jest.runAllTimers();

      expect(cache.activeObservables.size).toBe(1);

      subscription.unsubscribe();
      expect(cache.activeObservables.size).toBe(1);

      jest.runAllTimers();

      expect(cache.activeObservables.size).toBe(0);
    });

    describe('.read()', () => {
      it('throws a promise at first', async () => {
        const cache = new ObservableCache();

        const subject = new Subject<number>();
        const entry = cache.getOrInsert('id', subject);

        expect(() => entry.resource.read()).toThrow(Promise);
      });

      it('returns values', async () => {
        const cache = new ObservableCache();

        const subject = new BehaviorSubject('value');
        const entry = cache.getOrInsert('id', subject);

        expect(entry.resource.read()).toBe('value');

        subject.next('next value');
        expect(entry.resource.read()).toBe('next value');
      });

      it('throws error, waits, and removes itself', async () => {
        const cache = new ObservableCache();

        const subject = new BehaviorSubject('value');
        const entry = cache.getOrInsert('id', subject);

        expect(entry.resource.read()).toBe('value');

        expect(cache.activeObservables.size).toBe(1);

        subject.error(new Error('error'));
        expect(() => entry.resource.read()).toThrowError('error');

        expect(cache.activeObservables.size).toBe(1);

        jest.runAllTimers();

        expect(cache.activeObservables.size).toBe(0);
      });
    });

    it('only subscribes once to the source', async () => {
      const cache = new ObservableCache();

      const subject = new BehaviorSubject('value');
      let count = 0;

      const entry = cache.getOrInsert(
        'id',
        new Observable(subscriber => {
          count++;
          return subject.subscribe(subscriber);
        })
      );

      entry.observable.subscribe();
      entry.observable.subscribe();

      expect(count).toBe(1);
    });
  });
});
