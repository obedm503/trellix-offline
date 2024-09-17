import { RouteSectionProps, useNavigate } from "@solidjs/router";
import { createMutation } from "@tanstack/solid-query";
import { createEffect } from "solid-js";
import * as auth from "../api/auth";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  TextField,
  TextFieldErrorMessage,
  TextFieldInput,
  TextFieldLabel,
} from "../ui/text-field";
import { Alert, AlertDescription, AlertTitle } from "shared/ui/alert";

export default function LoginRoute(props: RouteSectionProps) {
  const navigate = useNavigate();
  const user = auth.getUser(false);
  createEffect(() => {
    // go home if logged in
    if (user()) {
      navigate("/");
    }
  });

  const login = createMutation(() => ({
    async mutationFn(data: FormData) {
      await auth.login(
        String(data.get("username")),
        String(data.get("password")),
      );
      return true;
    },
    onSuccess(success) {
      if (success) {
        const redirectTo = props.location.query.redirectTo || "/";
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
            <Alert>
              <AlertTitle>Heads up!</AlertTitle>
              <AlertDescription>
                If you registered at a different Trellix you can reuse the same
                credentials here.
              </AlertDescription>
            </Alert>

            <TextField validationState={login.error ? "invalid" : "valid"}>
              <TextFieldLabel>Username</TextFieldLabel>
              <TextFieldInput
                placeholder="Username"
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
                placeholder="Password"
                name="password"
                type="password"
                autocomplete="current-password"
                minLength={5}
                maxLength={60}
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
              Don't have a Trellix account?{" "}
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
