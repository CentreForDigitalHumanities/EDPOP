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
    'Title': 1,
    'Uniform Title': 4,
    'Varying Form of Title': 5,
    'Author': 8,
    'Collaborator': 12,
    'Production': 16,
    'Publisher': 20,
    'Added Entry - Corporate Name': 24,
    'Extent': 28,
    'Language': 32,
    'Citation/Reference': 36,
    'Location of Originals': 40,
    'Note': 44,
    'With Note': 48,
    'Subject Headings': 52,
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
