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
    'edpoprec:title': 3,
    'edpoprec:alternativeTitle': 6,
    'edpoprec:contributor': 9,
    'edpoprec:dating': 12,
    'edpoprec:placeOfPublication': 15,
    'edpoprec:publisherOrPrinter': 18,
    'edpoprec:bookseller': 21,
    'edpoprec:extent': 24,
    'edpoprec:genre': 27,
    'edpoprec:language': 30,
    'edpoprec:fingerprint': 33,
    'edpoprec:bibliographicalFormat': 36,
    'edpoprec:location': 39,
    'edpoprec:holdings': 42,
    'edpoprec:size': 45,
    'edpoprec:collationFormula': 48,
    'edpoprec:physicalDescription': 51,
    'edpoprec:typographicalFeatures': 54,
    'edpoprec:digitization': 57,
    // Biographical fields
    'edpoprec:name': 60,
    'edpoprec:variantName': 63,
    'edpoprec:timespan': 66,
    'edpoprec:gender': 69,
    'edpoprec:placeOfBirth': 72,
    'edpoprec:placeOfDeath': 75,
    'edpoprec:activity': 78,
    'edpoprec:placeOfActivity': 81,
    'edpoprec:activityTimespan': 84,
    // Common fields
    'edpoprec:fromCatalog': 87,
    'edpoprec:identifier': 90,
    'edpoprec:publicUrl': 93,
    'edpoprec:originalData': 96,
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
