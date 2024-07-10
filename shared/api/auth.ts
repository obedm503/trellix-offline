import { useNavigate } from "@solidjs/router";
import { createSignal, onCleanup, onMount } from "solid-js";
import { pb } from "./pb";
import { User } from "./schema";

export function getUser(redirectIfNone: boolean = true) {
  const navigate = useNavigate();
  const [user, setUser] = createSignal<User | null>(
    pb.authStore.isValid ? (pb.authStore.model as User) : null,
  );

  onMount(() => {
    if (!user() && redirectIfNone) {
      navigate("/login");
    }

    onCleanup(
      pb.authStore.onChange(() => {
        const user = pb.authStore.isValid ? (pb.authStore.model as User) : null;
        setUser(user);

        if (!user && redirectIfNone) {
          navigate("/login");
          return;
        }
      }),
    );
  });

  return user;
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
