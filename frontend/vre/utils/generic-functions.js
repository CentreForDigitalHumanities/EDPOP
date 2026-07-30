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

var canonicalOrderList = [
    // Placeholder to ensure positive indices
    '',
    // Bibliographical fields
    'edpoprec:title',
    'edpoprec:alternativeTitle',
    'edpoprec:genre',
    'edpoprec:language',
    'edpoprec:contributor',
    'edpoprec:dating',
    'edpoprec:publisherOrPrinter',
    'edpoprec:placeOfPublication',
    'edpoprec:bookseller',
    'edpoprec:location',
    'edpoprec:bibliographicalFormat',
    'edpoprec:collationFormula',
    'edpoprec:fingerprint',
    'edpoprec:extent',
    'edpoprec:size',
    'edpoprec:physicalDescription',
    'edpoprec:typographicalFeatures',
    'edpoprec:annotations',
    'edpoprec:holdings',
    'edpoprec:digitization',
    // Biographical fields
    'edpoprec:name',
    'edpoprec:variantName',
    'edpoprec:timespan',
    'edpoprec:gender',
    'edpoprec:placeOfBirth',
    'edpoprec:placeOfDeath',
    'edpoprec:activity',
    'edpoprec:placeOfActivity',
    'edpoprec:activityTimespan',
    // Common fields
    'edpoprec:fromCatalog',
    'edpoprec:identifier',
    'edpoprec:publicUrl',
    'edpoprec:originalData',
];

var canonicalOrder = _.chain(canonicalOrderList).invert().mapValues(Number).value();

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
