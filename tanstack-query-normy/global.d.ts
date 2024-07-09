declare module "lucide-solid/icons/*" {
  import { LucideProps } from "lucide-solid";
  import { Component } from "solid-js";
  const cmp: Component<LucideProps>;

  export = cmp;
}

declare module "*.md" {
  // "unknown" would be more detailed depends on how you structure frontmatter
  const attributes: Record<string, unknown>;

  // When "Mode.HTML" is requested
  const html: string;

  // Modify below per your usage
  export { attributes, html };
}
