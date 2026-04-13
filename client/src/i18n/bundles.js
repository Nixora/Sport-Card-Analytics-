import { mergeDeep } from "./mergeDeep.js";
import { en } from "./localeEn.js";
import { euCore } from "./patchEUCore.js";
import { patchDeLong } from "./patchDeLong.js";

export const bundles = {
  en,
  de: mergeDeep(mergeDeep(en, euCore.de), patchDeLong),
  fr: mergeDeep(en, euCore.fr),
  es: mergeDeep(en, euCore.es),
  it: mergeDeep(en, euCore.it),
  pl: mergeDeep(en, euCore.pl),
  nl: mergeDeep(en, euCore.nl),
};
