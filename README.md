# Offline-first Trellix Experiments

These are a set of experiments to compare different offline-first libraries.The core of the app is roughly based on [@ryanflorence](https://twitter.com/ryanflorence)'s [Trellix](https://www.youtube.com/playlist?list=PLXoynULbYuED9b2k5LS44v9TQjfXifwNu) with an added check list feature.

- Baseline app using just `@tanstack/query` with optimistic responses and no offline functionality.
  - [app](https://trellix-tanstack-query.up.railway.app/)
  - [source](https://github.com/obedm503/trellix-offline/tree/master/tanstack-query)
- `@tanstack/query` + [`normy`](https://github.com/klis87/normy) + [idb-keyval persister](https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient#building-a-persister) with automatic optimistic responses, cache normalization, and offline persistence.
  - [app](https://trellix-tanstack-query-normy.up.railway.app/)
  - [source](https://github.com/obedm503/trellix-offline/tree/master/tanstack-query-normy)

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
bun run dev

# or start the server and open the app in a new browser tab
bun run dev -- --open
```

## Building

Solid apps are built with _presets_, which optimise your project for deployment to different environments.

By default, `npm run build` will generate a Node app that you can run with `npm start`. To use a different preset, add it to the `devDependencies` in `package.json` and specify in your `app.config.js`.

## This project was created with the [Solid CLI](https://solid-cli.netlify.app)
