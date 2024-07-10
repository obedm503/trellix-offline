import { useNavigate, type RouteSectionProps } from "@solidjs/router";
import { createMutation } from "@tanstack/solid-query";
import { api } from "shared/api";
import { Button } from "shared/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "shared/ui/card";
import {
  TextField,
  TextFieldErrorMessage,
  TextFieldInput,
  TextFieldLabel,
} from "shared/ui/text-field";
import { createEffect } from "solid-js";

export default function Login(props: RouteSectionProps) {
  const navigate = useNavigate();
  const user = api.auth.getUser();
  createEffect(() => {
    // go home if logged in
    if (user()) {
      navigate("/");
    }
  });

  const login = createMutation(() => ({
    async mutationFn(data: FormData) {
      await api.auth.login(
        String(data.get("username")),
        String(data.get("password")),
      );
      return true;
    },
    onSuccess(success) {
      if (success) {
        const redirectTo = props.params.redirectTo || "/";
        navigate(redirectTo);
      }
    },
  }));

  return (
    <main class="grid h-screen w-screen items-center justify-center">
      <form
        class="max-w-96"
        onSubmit={(e) => {
          e.preventDefault();
          login.mutate(new FormData(e.currentTarget));
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
          </CardHeader>
          <CardContent>
            <TextField validationState={login.error ? "invalid" : "valid"}>
              <TextFieldLabel>Username</TextFieldLabel>
              <TextFieldInput
                name="username"
                type="text"
                autocomplete="username"
                minLength={8}
                maxLength={20}
              />
            </TextField>
            <TextField validationState={login.error ? "invalid" : "valid"}>
              <TextFieldLabel>Password</TextFieldLabel>
              <TextFieldInput
                name="password"
                type="password"
                autocomplete="current-password"
                minLength={5}
                maxLength={50}
              />
              <TextFieldErrorMessage>
                {login.error?.message}
              </TextFieldErrorMessage>
            </TextField>
          </CardContent>
          <CardFooter class="flex-col gap-4">
            <Button
              type="submit"
              size="lg"
              class="w-full"
              disabled={login.isPending}
            >
              Login
            </Button>

            <p>
              Don't have an account?{" "}
              <a href="/register" class="text-info-foreground underline">
                Register
              </a>
            </p>
          </CardFooter>
        </Card>
      </form>
    </main>
  );
}
