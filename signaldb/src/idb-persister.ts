import { del, get, set } from "idb-keyval";
import { createPersistenceAdapter } from "signaldb";

/**
 * Creates an Indexed DB persister
 * @see https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
 */
export function idbPersister<
  T extends { id: I } & Record<string, any>,
  I,
>(name: string) {
  const collectionId = `signaldb-collection-${name}`;
  async function getItems(): Promise<T[]> {
    const items = (await get(collectionId)) || [];
    return items;
  }
  return createPersistenceAdapter<T, I>({
    async register() {},
    async load() {
      const items = await getItems();
      return { items };
    },
    async save(items, { added, modified, removed }) {
      if (added.length === 0 && modified.length === 0 && removed.length === 0) {
        await set(collectionId, items);
        return;
      }

      const currentItems = await getItems();
      currentItems.push(...added);

      modified.forEach((item) => {
        const index = currentItems.findIndex(({ id }) => id === item.id);
        if (index === -1)
          throw new Error(`Item with ID ${item.id as string} not found`);
        currentItems[index] = item;
      });

      removed.forEach((item) => {
        const index = currentItems.findIndex(({ id }) => id === item.id);
        if (index === -1)
          throw new Error(`Item with ID ${item.id as string} not found`);
        currentItems.splice(index, 1);
      });

      await set(collectionId, currentItems);
    },
  });
}
