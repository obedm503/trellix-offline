import { RouteDefinition, Router } from "@solidjs/router";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import * as auth from "shared/api/auth";
import { Nav } from "shared/nav";
import { Toaster } from "shared/ui/toast";
import { lazy, onMount, Suspense } from "solid-js";
import { ReplicacheProvider } from "./replicache";

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
    <ReplicacheProvider>
      <QueryClientProvider client={queryClient}>
        <Router
          root={(props) => (
            <>
              <div class="flex h-screen w-screen flex-col gap-2">
                <Nav />

                <Suspense>{props.children}</Suspense>
              </div>

              <Toaster />
            </>
          )}
        >
          {routes}
        </Router>
      </QueryClientProvider>
    </ReplicacheProvider>
  );
}
