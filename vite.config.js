import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile as singleFile } from "vite-plugin-singlefile";
import { useHtmlPlugin as html, useHtmlCdnPlugin } from "@tomjs/vite-plugin-html";

export default defineConfig({
    appType: "spa",
    base: "./",
    build: {
        minify: "terser",
        modulePreload: false,
        rolldownOptions: {
            output: {
                exports: "none",
                minifyInternalExports: true,
            },
            preserveEntrySignatures: false,
            treeshake: true
        },
        terserOptions: {
            toplevel: true,
            mangle: {
                module: true
            },
            compress: {
                module: true,
                unsafe: true,
                unsafe_arrows: true,
                unsafe_comps: true,
                unsafe_math: true,
                unsafe_methods: true,
                unsafe_undefined: true,
                unsafe_proto: true,
                keep_fargs: false,
                hoist_funs: true,
                passes: 3
            },
            format: {
                ecma: 2016
            }
        }
    },
    plugins: [
        useHtmlCdnPlugin({
            modules: [
                {
                    name: "i18next",
                    file: ["dist/umd/i18next.min.js"],
                    var: "i18next"
                },
                {
                    name: "i18next-browser-languagedetector",
                    file: ["dist/umd/i18nextBrowserLanguageDetector.min.js"],
                    var: "i18nextBrowserLanguageDetector"
                },
                {
                    name: "@fortawesome/fontawesome-free",
                    file: ["css/fontawesome.min.css", "css/regular.min.css", "css/solid.min.css", "css/brands.min.css"],
                }
            ],
            type: "unpkg",
        }),
        tailwindcss(),
        singleFile(),
        html({
            minify: {
                collapseWhitespace: true,
                keepClosingSlash: false,
                collapseBooleanAttributes: true,
                removeComments: true,
                removeAttributeQuotes: true,
                removeRedundantAttributes: true,
                preventAttributesEscaping: true,
                removeScriptTypeAttributes: true,
                removeStyleLinkTypeAttributes: true,
                useShortDoctype: true
            }
        })
    ]
})