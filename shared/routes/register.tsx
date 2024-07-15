import { useNavigate, type RouteSectionProps } from "@solidjs/router";
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

export default function RegisterRoute(props: RouteSectionProps) {
  const navigate = useNavigate();
  const user = auth.getUser(false);
  createEffect(() => {
    // go home if logged in
    if (user()) {
      navigate("/");
    }
  });

  const register = createMutation(() => ({
    async mutationFn(data: FormData) {
      await auth.register(
        String(data.get("username")),
        String(data.get("password")),
      );
      return true;
    },
    onSuccess(success) {
      if (success) {
        navigate("/");
      }
    },
  }));

  return (
    <main class="grid h-screen w-screen items-center justify-center">
      <form
        class="max-w-96"
        onSubmit={(e) => {
          e.preventDefault();
          register.mutate(new FormData(e.currentTarget));
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Register</CardTitle>
          </CardHeader>
          <CardContent>
            <TextField validationState={register.error ? "invalid" : "valid"}>
              <TextFieldLabel>Username</TextFieldLabel>
              <TextFieldInput
                name="username"
                type="text"
                autocomplete="username"
                minLength={8}
                maxLength={20}
              />
            </TextField>
            <TextField validationState={register.error ? "invalid" : "valid"}>
              <TextFieldLabel>Password</TextFieldLabel>
              <TextFieldInput
                name="password"
                type="password"
                autocomplete="new-password"
                minLength={5}
                maxLength={60}
              />
              <TextFieldErrorMessage>
                {register.error?.message}
              </TextFieldErrorMessage>
            </TextField>
          </CardContent>
          <CardFooter class="flex-col gap-4">
            <Button
              type="submit"
              size="lg"
              class="w-full"
              disabled={register.isPending}
            >
              Register
            </Button>

            <p>
              Already have an account?{" "}
              <a href="/login" class="text-info-foreground underline">
                Login
              </a>
            </p>
          </CardFooter>
        </Card>
      </form>
    </main>
  );
}
