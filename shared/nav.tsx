import { useNavigate } from "@solidjs/router";
import { api } from "shared/api";
import { Show } from "solid-js";
import { Button } from "./ui/button";
import { NavigationMenu, NavigationMenuTrigger } from "./ui/navigation-menu";

export function Nav() {
  const user = api.auth.getUser();

  const navigate = useNavigate();
  function handleLogout() {
    api.auth.logout();
    navigate("/login");
  }

  return (
    <Show when={user()}>
      <div class="flex flex-row justify-between px-2 pt-2">
        <NavigationMenu>
          <NavigationMenuTrigger as="a" href="/" class="justify-start">
            Home
          </NavigationMenuTrigger>
          <NavigationMenuTrigger as="a" href="/board" class="justify-start">
            Boards
          </NavigationMenuTrigger>
          <NavigationMenuTrigger as="a" href="/list" class="justify-start">
            Lists
          </NavigationMenuTrigger>
        </NavigationMenu>

        <Button name="logout" type="button" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </Show>
  );
}
