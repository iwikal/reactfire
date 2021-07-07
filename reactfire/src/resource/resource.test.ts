import { Resource } from '.';

describe('Resource', () => {
  it('awaits', async () => {
    expect(await Resource.resolve(8)).toBe(8);
  });

  it('resolves', async () => {
    expect(await Resource.resolve(8)).toBe(8);
  });

  it('then', async () => {
    const resource = Resource.resolve(8).then(val => val + 1);
    expect(await resource).toBe(9);
  });

  it('recovers with catch', async () => {
    const resource = Resource.reject(3).catch(err => err + 1);
    expect(await resource).toBe(4);
  });

  it('recovers with then', async () => {
    const resource = Resource.reject(1).then(null, err => err - 1);
    expect(await resource).toBe(0);
  });

  it('rejects on throw from then', () => {
    const resource = Resource.resolve(0).then(() => {
      throw 5;
    });

    expect(resource).rejects.toBe(5);
  });

  it('rethrows with catch', () => {
    const resource = Resource.reject(4).catch(err => {
      throw err * 2;
    });

    expect(resource).rejects.toBe(8);
  });

  it('finalizes after resolve', async () => {
    const finalizer = jest.fn(() => {});
    const resource = Resource.resolve(1).finally(finalizer);
    await resource;
    expect(finalizer.mock.calls.length).toBe(1);
  });

  it('finalizes after reject', async () => {
    const finalizer = jest.fn(() => {});
    const resource = Resource.reject(1).finally(finalizer);
    expect(finalizer.mock.calls.length).toBe(0);
    await resource.catch(() => {});
    expect(finalizer.mock.calls.length).toBe(1);
  });

  it('resolves thens in order', async () => {
    let first = true;

    const resource = Resource.resolve();

    resource.then(() => {
      first = false;
    });

    await resource;
    expect(first).toBe(false);
  });
});
