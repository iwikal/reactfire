import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',
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
  ],
  output: [
    {
      file: 'pub/index.mjs',
      format: 'esm',
      name: 'reactfire'
    },
    {
      file: 'pub/index.js',
      format: 'cjs',
      name: 'reactfire'
    }
  ]
};
