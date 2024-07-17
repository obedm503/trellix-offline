import { createMutation, useQueryClient } from "@tanstack/solid-query";
import { keyBy, omit } from "lodash-es";

type Op = { _op: "create" } | { _op: "update" } | { _op: "delete" };
export function createOptimisticMutation<Input extends Op, Output = unknown>(
  config: () => {
    queryKey: any[];
    mutationFn(inputs: Input[]): Promise<Output[]>;
  },
) {
  const queryClient = useQueryClient();

  return createMutation(() => ({
    async mutationFn(inputs: Input[]) {
      return config().mutationFn(inputs);
    },
    async onMutate(variables) {
      const { queryKey } = config();

      await queryClient.cancelQueries({ queryKey });

      const rollbackData = queryClient.getQueryData<any[]>(queryKey);

      const deletes = variables
        .filter((item) => item._op === "delete")
        .map((item: any) => item.public_id);
      const updates = variables
        .filter((item) => item._op === "update")
        .map((item) => omit(item, "_op"));

      const updatesMap = keyBy(updates as any, "public_id");
      const creates = variables
        .filter((item) => item._op === "create")
        .map((item) => omit(item, "_op"));

      const optimisticData = rollbackData?.map((item) => {
        if (deletes.includes(item.public_id)) {
          return Object.assign(item, { deleted: true });
        }

        return item.public_id
          ? Object.assign(item, updatesMap[item.public_id])
          : item;
      });

      optimisticData?.push(...creates);

      return { optimisticData, rollbackData };
    },
  }));
}
