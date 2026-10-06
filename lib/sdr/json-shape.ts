import "server-only";

export function describeJsonShape(value: unknown): unknown {
  let keys = 0;
  const describe = (item: unknown, depth: number): unknown => {
    if (item === null) return "null";
    if (Array.isArray(item)) {
      if (depth >= 6) return "array";
      const first = item.find((entry) => entry !== null);
      return first === undefined
        ? { type: "array" }
        : { type: "array", item: describe(first, depth + 1) };
    }
    if (typeof item === "object") {
      if (depth >= 6 || keys >= 100) return "object";
      const shape: Record<string, unknown> = Object.create(null);
      for (const name of Object.keys(item as object)) {
        if (keys >= 100) break;
        if (!/^[A-Za-z0-9_.-]{1,80}$/.test(name) || /^\d{7,}$/.test(name)) continue;
        keys++;
        shape[name] = describe((item as Record<string, unknown>)[name], depth + 1);
      }
      return shape;
    }
    return ["string", "number", "boolean"].includes(typeof item)
      ? typeof item
      : "null";
  };
  return describe(value, 0);
}
