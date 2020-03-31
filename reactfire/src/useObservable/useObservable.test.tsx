import '@testing-library/jest-dom/extend-expect';
import { act, cleanup, render, waitForElement } from '@testing-library/react';
import * as React from 'react';
import { Subject, throwError } from 'rxjs';
import { useObservable } from '.';

describe('useObservable', () => {
  afterEach(cleanup);

  const fallbackComponentId = 'fallback-component';

  const FallbackComponent = () => (
    <h1 data-testid={fallbackComponentId}>Fallback</h1>
  );

  xit('throws a promise if the observable has no initial value', () => {
    const observable$: Subject<any> = new Subject();

    try {
      useObservable(observable$, 'test').read();
    } catch (thingThatWasThrown) {
      expect(thingThatWasThrown).toBeInstanceOf(Promise);
    }
  });

  xit('throws an error if there is an error on initial fetch', async () => {
    const expectedError = new Error('I am an error');
    const observable$ = throwError(expectedError);
    const errorComponentId = 'error-component';

    // stop a nasty-looking console error
    // https://github.com/facebook/react/issues/11098#issuecomment-523977830
    const spy = jest.spyOn(console, 'error');
    spy.mockImplementation(() => {});

    class ErrorBoundary extends React.Component<{}, { hasError: boolean }> {
      constructor(props) {
        super(props);
        this.state = { hasError: false };
      }

      static getDerivedStateFromError(receivedError: any) {
        expect(receivedError).toEqual(expectedError);
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
      }

      render() {
        if (this.state.hasError) {
          return <h1 data-testid={errorComponentId}>Error</h1>;
        } else {
          return this.props.children;
        }
      }
    }

    const Component = () => {
      const val = useObservable(observable$, 'test-error').read();
      return <h1 data-testid="thing">{val}</h1>;
    };

    const { getByTestId } = render(
      <ErrorBoundary>
        <React.Suspense fallback={<FallbackComponent />}>
          <Component />
        </React.Suspense>
      </ErrorBoundary>
    );

    const hej = await waitForElement(() => getByTestId(errorComponentId));
    console.log(hej);
    expect(getByTestId(errorComponentId)).toBeInTheDocument();

    spy.mockRestore();
  });

  xit('suspends until values appear', async () => {
    const values = ['a', 'b', 'c'];
    const observable$ = new Subject();
    const actualComponentId = 'actual-component';

    const Component = () => {
      const val = useObservable(observable$, 'test-suspense').read();
      return <h1 data-testid={actualComponentId}>{`${val}`}</h1>;
    };

    const { queryByTestId, getByTestId } = render(
      <React.Suspense fallback={<FallbackComponent />}>
        <Component />
      </React.Suspense>
    );

    // make sure Suspense renders the fallback component if the observable has not emitted a value
    expect(getByTestId(fallbackComponentId)).toBeInTheDocument();
    expect(queryByTestId(actualComponentId)).toBeNull();

    for (const value of values) {
      act(() => observable$.next(value));
      await waitForElement(() => getByTestId(actualComponentId));

      // make sure Suspense correctly renders its child after the observable emits a value
      expect(getByTestId(actualComponentId)).toBeInTheDocument();
      expect(getByTestId(actualComponentId)).toHaveTextContent(value);
      expect(queryByTestId(fallbackComponentId)).toBeNull();
    }
  });

  xit('returns the most recent value of an observable to all subscribers of an observableId', async () => {
    const values = ['a', 'b', 'c'];
    const observable$ = new Subject();
    const observableId = 'my-observable-id';
    const firstComponentId = 'first';
    const secondComponentId = 'second';

    const ObservableConsumer = props => {
      const val = useObservable(observable$, observableId).read();

      return <h1 {...props}>{val}</h1>;
    };

    const Component = ({ renderSecondComponent }) => {
      return (
        <React.Suspense fallback="loading">
          <ObservableConsumer data-testid={firstComponentId} />
          {renderSecondComponent ? (
            <ObservableConsumer data-testid={secondComponentId} />
          ) : null}
        </React.Suspense>
      );
    };

    const { getByTestId, rerender } = render(
      <Component renderSecondComponent={false} />
    );

    // emit one value to the first component (second one isn't rendered yet)
    act(() => observable$.next(values[0]));
    const comp = await waitForElement(() => getByTestId(firstComponentId));
    expect(comp).toHaveTextContent(values[0]);

    // emit a second value to the first component (second one still isn't rendered)
    act(() => observable$.next(values[1]));
    expect(comp).toHaveTextContent(values[1]);

    // keep the original component around, but now render the second one.
    // they both use the same observableId
    rerender(<Component renderSecondComponent={true} />);

    // the second component should start by receiving the latest value
    // since the first component has already been subscribed
    const comp2 = await waitForElement(() => getByTestId(secondComponentId));
    expect(comp2).toHaveTextContent(values[1]);
  });
});
