import { RouteSectionProps } from "@solidjs/router";
import { getUser } from "shared/api/auth";
import { html } from "../../README.md";

export default function Index(props: RouteSectionProps) {
  const user = getUser();

  return (
    <main class="grid h-screen w-screen items-center justify-center overflow-x-hidden">
      <div class="prose">
        <h2>Hello {user()?.username}!</h2>

        <article innerHTML={html}></article>
      </div>
    </main>
  );
}
