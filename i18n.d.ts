import "i18next";

declare module "i18next" {
    interface CustomPluginOptions {
        supportedLngsReal?: string[]
    }
}