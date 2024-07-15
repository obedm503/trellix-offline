import { useNavigate } from "@solidjs/router";
import { createSignal, onCleanup, onMount } from "solid-js";
import { pb } from "./pb";
import type { User } from "./schema";
import type { BaseAuthStore } from "pocketbase";

export function useAuthStore() {
  type AuthStore = Omit<BaseAuthStore, "model"> & { model: User };
  const [authStore, setAuthStore] = createSignal<AuthStore | undefined>(
    pb.authStore.isValid ? (pb.authStore as any as AuthStore) : undefined,
  );

  onMount(() => {
    onCleanup(
      pb.authStore.onChange(() => {
        const store = pb.authStore.isValid
          ? (pb.authStore as any as AuthStore)
          : undefined;
        setAuthStore(store);
      }),
    );
  });

  return authStore;
}

export function getUser(redirectIfNone?: true): () => User;
export function getUser(redirectIfNone: false): () => User | undefined;
export function getUser(
  redirectIfNone: boolean = true,
): () => User | undefined {
  const navigate = useNavigate();
  const store = useAuthStore();

  onMount(() => {
    if (!store() && redirectIfNone) {
      navigate("/login");
    }
  });

  return () => store()?.model!;
}

export function logout() {
  pb.authStore.clear();
}

export async function login(username: string, password: string) {
  await pb.collection("users").authWithPassword(username, password);
}
export async function register(username: string, password: string) {
  await pb
    .collection("users")
    .create({ username, password: password, passwordConfirm: password });

  await login(username, password);
}

export async function refresh() {
  await pb.collection("users").authRefresh();
}
