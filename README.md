# Local-first Trellix Experiments

These are a set of experiments to compare different local-first libraries. The core of the app was heavily on [@ryanflorence](https://twitter.com/ryanflorence)'s [Trellix](https://www.youtube.com/playlist?list=PLXoynULbYuED9b2k5LS44v9TQjfXifwNu) with an added TO-DO list feature. Entities are created, reordered, renamed, and soft deleted.

### Required features

- Load full entity dataset lazily. Working on a TO-DO list should not necessarily load boards because they're not directly related.
- No manual optimistic responses
- Instant interactions
- Cache datasets locally so the next load is instant
- Remote change subscription
- Cross-tab sync
- Schemaless but with TypeScript support
- Store offline cache in IndexedDB

### Ideal features

- Infinite queries for searching larger datasets
- Network awareness to pause and resume sync
- Field-level conflict resolution: Multiple updates to the same row should succeed as long as they mutate different fields.

<details>
  <summary>Implementation details</summary>

The app is a SPA PWA built with Solid and styled with [solid-ui](https://solid-ui.com/) and TailwindCSS.

The backend is a [PocketBase](https://pocketbase.io/) instance hosted on [Railway](https://railway.app/). These are implementation details because they don't affect the client's local-first features. I should be able to replace PocketBase with a custom backend with any DB engine.

</details>

<br />

# Experiments

- [Classic `@tanstack/query`](#tanstack-query)
- [`@tanstack/query` + normalized cache](#tanstack-query-normy)
- [SignalDB](#signaldb)
- [Replicache](#replicache)

<a id="tanstack-query"></a>

## `@tanstack/query` + persister ([App](https://trellix-tanstack-query.up.railway.app/), [Source](https://github.com/obedm503/trellix-offline/tree/master/tanstack-query))

This is the "baseline" app. It uses `query` with classic client + server, request + response setup with optimistic responses. It also integrates an IndexedDB persister to load queries from the cache on initial load.

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

This is the same as the baseline app except it integrates [`normy`](https://github.com/klis87/normy). Normy promises to do automatic cache updates by normalizing every response à la Apollo's normalized cache. It still requires manual optimistic responses and rollbacks.

### Pros

- Same as baseline
- Normalized cache should make individual row updates simpler

### Cons

- Same as baseline
- Normy does not support deleting an item from a list. [(comment)](https://github.com/klis87/normy/issues/19#issuecomment-1858928485)
- Did not get normy to handle deletes

<a id="signaldb"></a>

## SignalDB ([App](https://trellix-signaldb.up.railway.app/), [Source](https://github.com/obedm503/trellix-offline/tree/master/signaldb))

Uses [SignalDB](https://github.com/maxnowack/signaldb) to intermediate interactions to the server. SignalDB syncs an entire subset of a db table that the user may have access to. When a change occurs to the client's copy, Signaldb provides a hook for you to implement storing/pushing those changes to the authoritative source. Signaldb provides a hook to subscribe to remote changes. Signaldb allows defining a local persister to show data immediately.

Update since [v0.20.0](https://github.com/maxnowack/signaldb/releases/tag/v0.20.0): SignalDB added the [`SyncManager`](https://signaldb.js.org/sync/). `SyncManager` handles batching, retries, and last-write-wins replication.

### Pros

- Loads entire dataset and operates on it locally
- Instant changes without optimistic mutations
- No loading states anywhere
- Cross-client (tab and device) synchronization
- Simple yet powerful query API
- Allows only updating changed rows after a change
- Replication retry. New in [v0.20.0](https://github.com/maxnowack/signaldb/releases/tag/v0.20.0)
- Batching. New in [v0.20.0](https://github.com/maxnowack/signaldb/releases/tag/v0.20.0)
- Pulls, integrates local changes, and pushes. New in [v0.20.0](https://github.com/maxnowack/signaldb/releases/tag/v0.20.0)

### Cons

- SignalDB is pre-1.0
- Loads all datasets on startup. There is an [`AutoFetchCollection`](https://signaldb.js.org/replication/#autofetchcollection) that loads until requested, but it's meant for loading a different dataset for each query.
- ~~No built-in replication retry~~ Added in [v0.20.0](https://github.com/maxnowack/signaldb/releases/tag/v0.20.0)
- ~~Not local-first out of the box~~ Added in [v0.20.0](https://github.com/maxnowack/signaldb/releases/tag/v0.20.0)
- ~~No way to mark changes as confirmed or not~~ Added in [v0.20.0](https://github.com/maxnowack/signaldb/releases/tag/v0.20.0)
- No way to clear and reload a collection
- No way to unmount a collection after logout
- No transaction API to group inter-dependent cross-collection changes together
- Not aware of network connection. It should pause syncing if offline and resume when online

<a id="replicache"></a>

## Replicache ([App](https://trellix-replicache.up.railway.app/), [Source](https://github.com/obedm503/trellix-offline/tree/master/replicache))

Uses [Replicache](https://replicache.dev) based on their [`todo-row-versioning`](https://github.com/rocicorp/todo-row-versioning) example. Replicache is a proper local-first library. It applies changes to the local cache first and then sends just the update to the server. The server then responds with the confirmed patch. This example implements the [row versioning strategy](https://doc.replicache.dev/strategies/row-version) so only minimal patches are sent. The [Client View Record](https://doc.replicache.dev/strategies/row-version#client-view-records) strategy is genius but tricky.

This experiment does some things differently from the `todo-row-versioning` example. It uses the Pocketbase real-time API instead of implementing a new poking mechanism. It stores the CVR in the API's session store using Bun's SQLite.

### Pros

- Loads entire dataset and operates on it locally
- Instant changes without optimistic mutations
- No loading states anywhere
- Mutation made in transactions
- Built-in replication retry
- Local-first backed by IndexedDB
- Cross-client (tab and device) sync
- Server knows exactly what the client loaded so it can send minimal patches
- Aware of network connection. Pauses syncing if offline and resumes when online

### Cons

- No Solid integration
- Not reactive. `subscribe` does not react to external data changes
- Not open source, [for now?](https://x.com/aboodman/status/1808186642915905947)
- Limited querying API based on an item's cache key prefix
- May be tricky to extend to hundreds of entities

## Developing

Run `bun install` at the root.

To start a development server:

```bash
cd <experiment directory>

bun dev

# or start the server and open the app in a new browser tab
bun dev -- --open
```

## Building

Run `bun run build` in the specific experiment directory. You can preview the built app with `bun start`.

## This project was created with the [Solid CLI](https://solid-cli.netlify.app)
