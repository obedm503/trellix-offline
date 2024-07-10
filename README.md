# Offline-first Trellix Experiments

These are a set of experiments to compare different offline-first libraries.The core of the app was heavily on [@ryanflorence](https://twitter.com/ryanflorence)'s [Trellix](https://www.youtube.com/playlist?list=PLXoynULbYuED9b2k5LS44v9TQjfXifwNu) with an added TO-DO list feature. Entities are created, reordered, renamed, and soft deleted.

### Required features

- Load full entity dataset lazily. Working on a TO-DO list's should not necessarily load boards because they're not directly related.
- No manual optimistic responses
- Instant interactions
- Cache datasets locally so next load is instant
- Remote change subscription
- Cross-tab sync
- Schemaless but with TypeScript support

### Ideal features

- Infinite queries for seaching larger datasets

<details>
  <summary>Implementation details</summary>

The app is a SPA PWA built with Solid and styled with [solid-ui](https://solid-ui.com/) and TailwindCSS.

The backend is a [PocketBase](https://pocketbase.io/) instance hosted on [Railway](https://railway.app/). These are implentation details because they don't affect the client's offline-first features. I should be able to replace PocketBase with a custom backend with any DB engine.

</details>

<br />

# Experiments

- [Classic `@tanstack/query`](#tanstack-query)
- [`@tanstack/query` + normalized cache](#tanstack-query-normy)
- [SignalDB](#signaldb)
- Replicache coming soon...

<a id="tanstack-query"></a>

## `@tanstack/query` + persister ([App](https://trellix-tanstack-query.up.railway.app/), [Source](https://github.com/obedm503/trellix-offline/tree/master/tanstack-query))

This is the "baseline" app. It uses `query` with classic client + server, request + response setup with optimistic responses. It also integrates an IndexedDB persister to load queries from cache on initial load.

### Pros

- Familiar client + server, request + response model
- `@tanstack/query` is very good

### Cons

- Manual optimistic responses on every interaction that would not scale to 100s of db entities.
- Loading states everywhere
- Completely fails when offline and changes interfere with each other. Optimistic responses are not true conflict resolution.
- No cross-client (tab or device) synchronization
- No remote change subscription

<a id="tanstack-query-normy"></a>

## `@tanstack/query` + persister + `normy` ([App](https://trellix-tanstack-query-normy.up.railway.app/), [Source](https://github.com/obedm503/trellix-offline/tree/master/tanstack-query-normy))

This is the same as the baseline app except it integrates [`normy`](https://github.com/klis87/normy). Normy promises to do automatic cache updates by normalizing every response a la Apollo's normalizes cache. It still requires manual optimistic responses and rollbacks.

### Pros

- Same as baseline
- Normalized cache should make individual row updates simpler

### Cons

- Same as baseline
- Normy does not support deleting an item from a list. [(comment)](https://github.com/klis87/normy/issues/19#issuecomment-1858928485)
- Did not get normy to handle deletes

<a id="signaldb"></a>

## SignalDB ([App](https://trellix-signaldb.up.railway.app/), [Source](https://github.com/obedm503/trellix-offline/tree/master/signaldb))

Uses [SignalDB](https://github.com/maxnowack/signaldb) to intermediate interactions to the server. SignalDB syncs an entire subset of a db table that the user may have access to. When a change occurs to the client's copy, signaldb provides a hook for you to implement storing/pushing those changes to the authoritative source. Signaldb also provides a hook to subscribe to remote changes. Right now it reloads the entire dataset on a change, but will soon integrate remote changes ([#776](https://github.com/maxnowack/signaldb/pull/776)). Signaldb also allows defining a local persister to show data on initial load.

### Pros

- Loads entire dataset and operates on it locally
- Instant changes without optimistic mutations
- No loading states anywhere
- Cross-client (tab and device) synchronization
- Simple yet powerful query api
- Allows only updating changed rows after a change

### Cons

- SignalDB is pre 1.0
- Loads all datasets on startup. There is an [`AutoFetchCollection`](https://signaldb.js.org/replication/#autofetchcollection) that loads until requested, but it's meant for loading a different dataset for each query.

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
