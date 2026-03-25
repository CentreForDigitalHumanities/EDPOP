import _ from 'lodash';
import { Model } from 'backbone';

/**
 * Perform the following transformation:
 * (from)  {foo: 'bar', foobar: 'baz'}
 * (to)    'foo=bar&foobar=baz'
 */
export function objectAsUrlParams(object) {
    return _(object).entries().invokeMap('join', '=').join('&');
}

export function canonicalSort(key) {
    var index = (canonicalOrder[key] || 100);
    return index;
}

var canonicalOrder = {
    // Bibliographical fields
    'edpoprec:title': 1,
    'edpoprec:alternativeTitle': 5,
    'edpoprec:contributor': 8,
    'edpoprec:dating': 16,
    'edpoprec:placeOfPublication': 18,
    'edpoprec:publisherOrPrinter': 20,
    'edpoprec:bookseller': 22,
    'edpoprec:extent': 28,
    'edpoprec:genre': 30,
    'edpoprec:language': 32,
    'edpoprec:fingerprint': 36,
    'edpoprec:bibliographicalFormat': 39,
    'edpoprec:location': 40,
    'edpoprec:holdings': 41,
    'edpoprec:size': 41.5,
    'edpoprec:collationFormula': 41.75,
    'edpoprec:physicalDescription': 42,
    'edpoprec:typographicalFeatures': 43,
    'edpoprec:digitization': 44,
    // Biographical fields
    'edpoprec:name': 50,
    'edpoprec:variantName': 51,
    'edpoprec:timespan': 52,
    'edpoprec:gender': 54,
    'edpoprec:placeOfBirth': 56,
    'edpoprec:placeOfDeath': 60,
    'edpoprec:activity': 62,
    'edpoprec:placeOfActivity': 64,
    'edpoprec:activityTimespan': 68,
    // Common fields
    'edpoprec:fromCatalog': 72,
    'edpoprec:identifier': 76,
    'edpoprec:publicUrl': 80,
    'edpoprec:originalData': 88,
};

/**
 * Translate from compacted JSON-LD `@type` strings to payload objects suitable
 * for decision making in a Mustache template.
 * @param recordType {string|Model} recordType - a JSON-LD URI shorthand with
 * the `edpoprec:` prefix, or a model that has such a string as its `'@type'`
 * attribute.
 * @returns {object} A newly created object with at most one own enumerable
 * property. The key of the property is either `'isBibliographical'` or
 * `'isBiographical'`, depending on the passed `recordType`. The value of the
 * property is `true` in both cases.
 */
export function typeTranslation(recordType) {
    if (recordType instanceof Model) recordType = recordType.get('@type');
    switch (recordType) {
    case 'edpoprec:BibliographicalRecord':
        return {isBibliographical: true};
    case 'edpoprec:BiographicalRecord':
        return {isBiographical: true};
    }
    return {};
}
