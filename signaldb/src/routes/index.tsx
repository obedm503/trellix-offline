import { RouteSectionProps } from "@solidjs/router";
import { api } from "shared/api";
import { html } from "../../../README.md";

export default function Index(props: RouteSectionProps) {
  const user = api.auth.getUser();

  return (
    <main class="grid h-screen w-screen items-center justify-center overflow-x-hidden">
      <div class="prose">
        <h2>Hello {user()?.username}!</h2>

        <article innerHTML={html}></article>
      </div>
    </main>
  );
}
