import { ReadTransaction, Replicache } from "replicache";
import { useAuthStore } from "shared/api/auth";
import { pb } from "shared/api/pb";
import {
  Accessor,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  JSXElement,
  on,
  onCleanup,
  useContext,
} from "solid-js";
import { type Mutators, mutators } from "./mutators";

const ReplicacheContext = createContext<Replicache<Mutators> | undefined>();
export function useReplicache() {
  const rep = useContext(ReplicacheContext);
  if (!rep) {
    throw new Error("Unauthorized");
  }
  return rep;
}

export function ReplicacheProvider(props: { children: JSXElement }) {
  const authStore = useAuthStore();
  const rep = createMemo<Replicache<Mutators> | undefined>((prev) => {
    if (prev) {
      prev.close();
    }

    const auth = authStore();
    if (!auth) {
      return;
    }

    return new Replicache<Mutators>({
      name: auth.model.id,
      licenseKey: import.meta.env.VITE_REPLICACHE_LICENSE,
      auth: auth.token,
      pushURL: `/api/push?userID=${auth.model.id}`,
      pullURL: `/api/pull?userID=${auth.model.id}`,
      mutators,
    });
  });
  onCleanup(() => {
    rep()?.close();
  });

  createEffect(
    on([authStore, rep], async ([auth, rep]) => {
      if (!auth || !rep) {
        return;
      }

      const collections = [
        "list",
        "list_item",
        "board",
        "board_column",
        "board_item",
      ];

      await Promise.all(
        collections.map((collection) =>
          pb.collection(collection).subscribe("*", () => {
            rep.pull();
          }),
        ),
      );

      onCleanup(async () => {
        await Promise.all(
          collections.map((collection) =>
            pb.collection(collection).unsubscribe(),
          ),
        );
      });
    }),
  );

  return (
    <ReplicacheContext.Provider value={rep()}>
      {props.children}
    </ReplicacheContext.Provider>
  );
}

type SubscribeOptions<T, R> = { initial?: T; select?: (data: T) => R };
export function createSubscribe<T>(
  read: (tx: ReadTransaction) => Promise<T>,
): Accessor<T | undefined>;
export function createSubscribe<T, R = T>(
  read: (tx: ReadTransaction) => Promise<T>,
  { initial, select }: SubscribeOptions<T, R>,
): Accessor<R>;
export function createSubscribe<T, R>(
  read: (tx: ReadTransaction) => Promise<T>,
  { initial, select }: SubscribeOptions<T, R> = {},
) {
  const rep = useReplicache();
  const [get, set] = createSignal<T>(initial as any);

  createEffect(() => {
    onCleanup(
      rep.subscribe<T>(read, (value) => {
        set(() => value);
      }),
    );
  });

  if (select) {
    return createMemo(() => select(get()));
  }

  return get;
}
