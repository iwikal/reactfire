import { cleanup } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { useFirebaseApp } from '.';
import { FirebaseAppProvider } from './index';

afterEach(cleanup);

describe('useFirebaseApp', () => {
  it('finds firebase from Context', () => {
    const firebaseApp = { a: 1 };

    const wrapper = (props: any) => (
      <FirebaseAppProvider firebaseApp={firebaseApp as any}>
        {props.children}
      </FirebaseAppProvider>
    );

    const { result } = renderHook(() => useFirebaseApp().read(), { wrapper });
    expect(result.error).toBeUndefined();
    expect(result.current).toBe(firebaseApp);
  });

  it('throws an error if Firebase is not in context', () => {
    const { result } = renderHook(() => useFirebaseApp().read());

    expect(result.error).toBeDefined();
  });
});
