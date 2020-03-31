import { performance } from 'firebase/app';
import React from 'react';
import { useFirebaseApp } from '../firebaseApp';

interface FallbackProps {
  traceId: string;
  perf: performance.Performance;
  fallback: React.ReactNode;
}

function Fallback(props: FallbackProps) {
  React.useLayoutEffect(() => {
    const trace = props.perf.trace(props.traceId);
    trace.start();

    return () => {
      trace.stop();
    };
  }, [props.perf, props.traceId]);

  return <>{props.fallback}</>;
}

export interface SuspensePerfProps {
  children: React.ReactNode;
  traceId: string;
  fallback: React.ReactNode;
  firePerf?: performance.Performance;
}

export function SuspenseWithPerf({
  children,
  traceId,
  fallback,
  firePerf
}: SuspensePerfProps): JSX.Element {
  const appResource = useFirebaseApp();
  const perf = firePerf || appResource.read().performance();

  return (
    <React.Suspense
      fallback={<Fallback traceId={traceId} perf={perf} fallback={fallback} />}
    >
      {children}
    </React.Suspense>
  );
}
