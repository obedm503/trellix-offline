import { createMutation, useQueryClient } from "@tanstack/solid-query";
import { keyBy, omit } from "lodash-es";

type Op = { _op: "create" } | { _op: "update" } | { _op: "delete" };
export function createOptimisticMutation<Input extends Op, Output = unknown>(
  config: () => {
    queryKey: any[];
    mutationFn(inputs: Input[]): Promise<Output[]>;
    idKey: keyof Output;
    publicIdKey: keyof Output;
  },
) {
  const queryClient = useQueryClient();

  return createMutation(() => ({
    async mutationFn(inputs: Input[]) {
      return config().mutationFn(inputs);
    },
    async onMutate(variables) {
      const { idKey, queryKey } = config();

      await queryClient.cancelQueries({ queryKey });

      const oldData = queryClient.getQueryData<any[]>(queryKey);

      queryClient.setQueryData<any[]>(queryKey, (old) => {
        if (!old) {
          return;
        }

        const deletes = variables
          .filter((item) => item._op === "delete")
          .map((item: any) => item[idKey]);
        const updates = variables
          .filter((item) => item._op === "update")
          .map((item) => omit(item, "_op"));
        const updatesMap = keyBy(updates as any, idKey);
        const creates = variables
          .filter((item) => item._op === "create")
          .map((item) => omit(item, "_op"));

        const optimistic = old
          .filter((item) => {
            const shouldDelete = idKey in item && deletes.includes(item[idKey]);
            return !shouldDelete;
          })
          .map((item) => {
            const updated =
              idKey in item && item[idKey]
                ? updatesMap[item[idKey]]
                : undefined;
            return updated ? Object.assign({}, item, updated) : item;
          });

        optimistic.push(...creates);

        return optimistic;
      });
      return { oldData };
    },
    onSuccess(results, variables, context) {
      const { publicIdKey, queryKey, idKey } = config();

      const resultsMap = keyBy(results, publicIdKey);

      queryClient.setQueryData<any[]>(queryKey, (old) => {
        if (!old) {
          return;
        }

        return old.map((item) => {
          const found = resultsMap[item[publicIdKey]];
          return found ?? item;
        });
      });
    },
    onError(error, variables, context) {
      queryClient.setQueryData<any[]>(
        config().queryKey,
        (old) => old && context?.oldData,
      );
    },
  }));
}
