import { A, useNavigate } from "@solidjs/router";
import { Button } from "shared/ui/button";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <main class="mx-auto my-auto p-4 text-center text-gray-700">
      <Button variant="link" class="text-xl block" onClick={() => navigate(-1)}>
        You should go back.
      </Button>

      <p class="my-4">
        Or go{" "}
        <A href="/" class="text-primary hover:underline">
          home
        </A>
      </p>
    </main>
  );
}
