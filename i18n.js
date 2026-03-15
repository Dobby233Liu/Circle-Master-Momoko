import i18next from "i18next";
import i18nextBrowserLanguageDetector from "i18next-browser-languagedetector";

const i18nObserver = new MutationObserver(onI18nAttrChanged);
const languageSelector = document.getElementById("language-selector");
export function prepResourceLoad() {
    i18nObserver.disconnect();
    languageSelector.removeEventListener("change", onLanguageSelection);
    languageSelector.disabled = true;
}
prepResourceLoad();

export const PROP_KV_SPLITTER = "::";
export const PROP_ENTRY_SPLITTER = "%%";
function splitProp(mainProp) {
    if (!mainProp) return;
    
    const items = mainProp.split(PROP_ENTRY_SPLITTER);
    const map = new Map();
    for (const item of items) {
        if (item.length == 0) continue;
        const itemSplit = item.split(PROP_KV_SPLITTER);
        const key = itemSplit.length > 1 ? itemSplit[0] : "innerHTML";
        if (key == "__proto__")
            continue;
        map.set(key, itemSplit[1] ?? itemSplit[0]);
    }
    return map;
}

function applyI18nToTextOf(elem) {
    const keysByProp = splitProp(elem.dataset.i18n);
    if (keysByProp?.size == 0) return;
    
    const contextByProp = splitProp(elem.dataset.i18nContext);
    const interpolationByProp = splitProp(elem.dataset.i18nInterpolationData);
    
    for (const [prop, key] of keysByProp) {
        if (!(prop in elem)) {
            console.error("Attempted to apply i18n on nonexistent property", elem, prop);
            return false;
        }
        
        const propInterpolationRaw = interpolationByProp?.get(prop);
        let propInterpolation;
        if (propInterpolationRaw) {
            try {
                propInterpolation = JSON.parse(propInterpolationRaw);
                if (typeof propInterpolation !== "object")
                    throw new Error('typeof propInterpolation !== "object"');
            } catch (err) {
                console.error("Bad interpolation data for:", elem, prop, err);
                return false;
            }
        }
        
        elem[prop] = i18next.t(key, {
            context: contextByProp?.get(prop),
            ...propInterpolation
        });
    }
    
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
    for (const lng of i18next.options.supportedLngsReal ?? i18next.options.supportedLngs) {
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

/**
 * @param {import("i18next").InitOptions} o 
 * @returns {import("i18next").InitOptions}
 */
function /*@__INLINE__*/ defineI18nextOptions(o) {
    return o;
}

/**
 * @param {import("i18next").InitOptions} options
 */
export async function initI18n(resources={}, options={}) {
    i18next.use(i18nextBrowserLanguageDetector);
    i18next.on("languageChanged", onLangChange);
    i18next.on("initialized", onI18nLoaded);
    i18next.on("loaded", onI18nLoaded);
    await i18next.init(defineI18nextOptions({
        showSupportNotice: false,
        resources: resources,
        detection: {
            order: ["querystring", "localStorage", "navigator"],
            lookupQuerystring: "lang"
        },
        ...options
    }));
}