/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom/extend-expect';
import { render, waitForElement, cleanup, act } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import * as firebase from '@firebase/testing';
import { useDatabaseObject, useDatabaseList, FirebaseAppProvider } from '..';

describe('Realtime Database (RTDB)', () => {
  let app: import('firebase').app.App;

  beforeAll(async () => {
    app = firebase.initializeTestApp({
      projectId: '12345',
      databaseName: 'my-database',
      auth: { uid: 'alice' }
    }) as import('firebase').app.App;
  });

  afterEach(async () => {
    cleanup();

    // clear out the database
    app
      .database()
      .ref()
      .set(null);
  });

  test('sanity check - emulator is running', () => {
    // IF THIS TEST FAILS, MAKE SURE YOU'RE RUNNING THESE TESTS BY DOING:
    // yarn test

    return app
      .database()
      .ref('hello')
      .set({ a: 'world' });
  });

  describe('useDatabaseObject', () => {
    it('can get an object [TEST REQUIRES EMULATOR]', async () => {
      const mockData = { a: 'hello' };

      const ref = app.database().ref('hello');

      await ref.set(mockData);

      const ReadObject = () => {
        const { snapshot } = useDatabaseObject(ref).read();

        return <h1 data-testid="readSuccess">{snapshot.val().a}</h1>;
      };

      const { getByTestId } = render(
        <FirebaseAppProvider firebaseApp={app}>
          <React.Suspense fallback={<h1 data-testid="fallback">Fallback</h1>}>
            <ReadObject />
          </React.Suspense>
        </FirebaseAppProvider>
      );

      await waitForElement(() => getByTestId('readSuccess'));

      expect(getByTestId('readSuccess')).toContainHTML(mockData.a);
    });
  });

  describe('useDatabaseList', () => {
    it('can get a list [TEST REQUIRES EMULATOR]', async () => {
      const mockData1 = { a: 'hello' };
      const mockData2 = { a: 'goodbye' };

      const ref = app.database().ref('myList');

      act(() => void ref.push(mockData1));
      act(() => void ref.push(mockData2));

      const ReadList = () => {
        const changes = useDatabaseList(ref).read();

        return (
          <ul data-testid="readSuccess">
            {changes.map(({ snapshot }) => (
              <li key={String(snapshot.key)} data-testid="listItem">
                {snapshot.val().a}
              </li>
            ))}
          </ul>
        );
      };

      const { getAllByTestId } = render(
        <FirebaseAppProvider firebaseApp={app}>
          <React.Suspense fallback={<h1 data-testid="fallback">Fallback</h1>}>
            <ReadList />
          </React.Suspense>
        </FirebaseAppProvider>
      );

      await waitForElement(() => getAllByTestId('listItem'));

      expect(getAllByTestId('listItem').length).toEqual(2);
    });

    it('Returns different data for different queries on the same path [TEST REQUIRES EMULATOR]', async () => {
      const mockData1 = { a: 'hello' };
      const mockData2 = { a: 'goodbye' };

      const ref = app.database().ref('items');
      const filteredRef = ref.orderByChild('a').equalTo('hello');

      act(() => void ref.push(mockData1));
      act(() => void ref.push(mockData2));

      const ReadFirestoreCollection = () => {
        const list = useDatabaseList(ref).read();
        const filteredList = useDatabaseList(filteredRef).read();

        // filteredList's length should be 1 since we only added one value that matches its query
        expect(filteredList.length).toEqual(1);

        // the full list should be bigger than the filtered list
        expect(list.length).toBeGreaterThan(filteredList.length);

        return <h1 data-testid="rendered">Hello</h1>;
      };

      const { getByTestId } = render(
        <FirebaseAppProvider firebaseApp={app}>
          <React.Suspense fallback={<h1 data-testid="fallback">Fallback</h1>}>
            <ReadFirestoreCollection />
          </React.Suspense>
        </FirebaseAppProvider>
      );

      await waitForElement(() => getByTestId('rendered'));
    });
  });
});
