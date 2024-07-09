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

export default function Register(props: RouteSectionProps) {
  const navigate = useNavigate();
  const user = api.auth.getUser(false);
  createEffect(() => {
    // go home if logged in
    if (user()) {
      navigate("/");
    }
  });

  const register = createMutation(() => ({
    async mutationFn(data: FormData) {
      await api.auth.register(
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
                maxLength={50}
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
