import * as esbuild from "esbuild";

await esbuild.build({
    entryPoints: ["./src/index.ts"],
    bundle: true,
    platform: "node",
    target: "node18",
    format: "esm",
    banner: { js: "#!/usr/bin/env node" },
    outfile: "./dist/bin/index.js",
    packages: "external",
    external: ["react-devtools-core"],
    loader: { ".md": "text" },
});

console.log("Build complete");
