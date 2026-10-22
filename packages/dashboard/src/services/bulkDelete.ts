export async function removeAll(
  ids: number[],
  remove: (id: number) => Promise<unknown>,
): Promise<void> {
  const results = await Promise.allSettled(ids.map(remove));
  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0) {
    throw new Error(`Failed to delete ${failed} of ${ids.length} items.`);
  }
}
