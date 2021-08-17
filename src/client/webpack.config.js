const path = require('path')

module.exports = {
  mode: process.env.NODE_ENV ?? 'development',
  entry: {
    game: './game.tsx',
    index: './index.tsx',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@shared-types': path.resolve(
        __dirname,
        '../server/shared-types/index.ts'
      ),
    },
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, '../../dist/client'),
  },
}
