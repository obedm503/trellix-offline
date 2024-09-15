import { RouteDefinition, Router } from "@solidjs/router";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import * as auth from "shared/api/auth";
import { Nav } from "shared/nav";
import { Toaster } from "shared/ui/toast";
import { lazy, onMount, Show, Suspense } from "solid-js";
import { CollectionsProvider, createCollections } from "./collections";

const routes: RouteDefinition[] = [
  {
    path: "/",
    component: lazy(() => import("shared/routes/index")),
  },
  {
    path: "/login",
    component: lazy(() => import("shared/routes/login")),
  },
  {
    path: "/register",
    component: lazy(() => import("shared/routes/register")),
  },
  {
    path: "/list",
    component: lazy(() => import("./routes/list")),
  },
  {
    path: "/list/:list_public_id",
    component: lazy(() => import("./routes/list/[list_public_id]")),
  },
  {
    path: "/board",
    component: lazy(() => import("./routes/board")),
  },
  {
    path: "/board/:board_public_id",
    component: lazy(() => import("./routes/board/[board_public_id]")),
  },
  { path: "*404", component: lazy(() => import("shared/routes/not-found")) },
];

export function App() {
  const queryClient = new QueryClient();

  onMount(() => {
    auth.refresh().catch(console.error);
  });

  return (
    <QueryClientProvider client={queryClient}>
      <Router
        root={(props) => (
          <>
            <div class="flex h-screen w-screen flex-col gap-2">
              <Nav />

              <Suspense>
                <Show
                  when={
                    props.location.pathname !== "/login" &&
                    props.location.pathname !== "/register"
                  }
                  fallback={props.children}
                >
                  <CollectionsProvider value={createCollections()}>
                    {props.children}
                  </CollectionsProvider>
                </Show>
              </Suspense>
            </div>

            <Toaster />
          </>
        )}
      >
        {routes}
      </Router>
    </QueryClientProvider>
  );
}
