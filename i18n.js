import i18next from "i18next";
import i18nextBrowserLanguageDetector from "i18next-browser-languagedetector";

const i18nObserver = new MutationObserver(onI18nAttrChanged);
const languageSelector = document.getElementById("language-selector");
export function prepI18nLoad() {
    i18nObserver.disconnect();
    languageSelector.removeEventListener("change", onLanguageSelection);
    languageSelector.disabled = true;
}
prepI18nLoad();

function applyI18nToTextOf(elem) {
    if (!elem?.dataset?.i18n)
        return;
    
    const context = elem.dataset.i18nContext;
    let interpolationData = {};
    if (elem.dataset.i18nInterpolationData) {
        try {
            interpolationData = JSON.parse(elem.dataset.i18nInterpolationData);
            if (typeof interpolationData !== "object")
                throw new Error('typeof interpolationData !== "object"');
        } catch (err) {
            console.error("Bad interpolation data for:", elem, err);
            return false;
        }
    }
    
    const str = i18next.t(elem.dataset.i18n, {
        context: context,
        ...interpolationData
    });
    elem.innerHTML = str;
    return true;
}
function applyI18nToTextOfAll(root = document) {
    for (const elem of root.querySelectorAll("[data-i18n]"))
        applyI18nToTextOf(elem);
}

function onLangChange() {
    document.documentElement.lang = i18next.language;
    applyI18nToTextOfAll();
}
const I18N_ATTRS = ["data-i18n", "data-i18n-context", "data-i18n-interpolation-data"];
function onI18nLoaded() {
    onLangChange();
    
    i18nObserver.observe(document, {
        subtree: true,
        attributes: true,
        attributeFilter: I18N_ATTRS
    });
    
    languageSelector.replaceChildren();
    for (const lng of TRUE_SUPPORTED_LANGS) {
        const option = languageSelector.appendChild(document.createElement("option"));
        option.value = lng;
        option.innerText = i18next.t("languageName", { lng });
        if (lng == i18next.resolvedLanguage) option.selected = true;
    }
    languageSelector.addEventListener("change", onLanguageSelection);
    languageSelector.disabled = false;
}

function onI18nAttrChanged(records) {
    const elems = new Set();
    for (const record of records) {
        if (I18N_ATTRS.includes(record.attributeName))
            elems.add(record.target);
    }
    for (const elem of elems)
        applyI18nToTextOf(elem);
}

function onLanguageSelection(ev) {
    i18next.changeLanguage(ev.target.value);
}

export function setTextLocalizable(elem, key, options) {
    if (!key) {
        delete elem.dataset.i18n;
        return;
    }
    elem.dataset.i18n = key;
    if (options?.context)
        elem.dataset.i18nContext = options?.context;
    else
        delete elem.dataset.i18nContext;
    if (options?.interpolation)
        elem.dataset.i18nInterpolationData = JSON.stringify(options.interpolation);
    else
        delete elem.dataset.i18nInterpolationData;
}

import i18nResources from "./i18n-resources.json";
// can't obtain anything like this from i18next
const TRUE_SUPPORTED_LANGS = ["ja", "zh-Hans", "en"];
export async function initI18n() {
    i18next.use(i18nextBrowserLanguageDetector);
    i18next.on("languageChanged", onLangChange);
    i18next.on("initialized", onI18nLoaded);
    i18next.on("loaded", onI18nLoaded);
    await i18next.init({
        supportedLngs: ["ja", "zh-Hans", "zh-CN", "zh", "en"],
        fallbackLng: {
            zh: ["zh-Hans", "ja"],
            "zh-CN": ["zh-Hans", "ja"],
            default: ["ja"]
        },
        detection: {
            order: ["querystring", "navigator"],
            lookupQuerystring: "lang"
        },
        resources: i18nResources
    });
}