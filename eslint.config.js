import raycastConfig from "@raycast/eslint-config";

const baseConfig = raycastConfig.flatMap((config) =>
  Array.isArray(config) ? config : [config]
);

export default [
  ...baseConfig,
  {
    ignores: [
      "node_modules",
      "dist",
      "storage",
    ],
  },
];
