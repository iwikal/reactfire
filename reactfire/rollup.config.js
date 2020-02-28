import typescript from '@rollup/plugin-typescript';

const config = {
  input: './index.ts',
  plugins: [typescript()],
  external: [
    'firebase/app',
    'react',
    'rxfire/auth',
    'rxfire/database',
    'rxfire/firestore',
    'rxfire/storage',
    'rxjs',
    'rxjs/operators'
  ]
};

export default [
  {
    ...config,
    output: {
      dir: './pub/reactfire/cjs',
      format: 'cjs',
      name: 'reactfire'
    }
  },
  {
    ...config,
    output: {
      dir: './pub/reactfire/esm',
      format: 'esm',
      name: 'reactfire'
    }
  }
];
