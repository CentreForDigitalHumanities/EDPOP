/**
 * Models, collections and utilities related to the record ontology.
 */

import _ from 'lodash';
import { FilteredCollection } from './filtered.collection.js';
import { JsonLdNestedCollection } from './jsonld.model';

/**
 * A Backbone collection to access the properties defined by the ontology.
 */
export var PropertyList = JsonLdNestedCollection.extend({
    url: "/static/edpop-record-ontology.json",
    targetClass: "rdf:property",
});

export var properties = new PropertyList();
properties.fetch();

/**
 * Regular expression matching `'edpoprec:Record'`,
 * `'edpoprec:BiographicalRecord'` and `'edpoprec:BibliographicalRecord'`. The
 * first capturing group contains the full qualification before `'Record'` (if
 * present), while the second capturing group contains only the part `'Bio'` or
 * `'Biblio'`.
 */
var recordTypePattern = /^edpoprec:((Bi(?:bli)?o)graphical)?Record$/;

/**
 * Determine whether the given domain matches the target class.
 * @param {string} target - Can be `'Biblo'` or `'Bio'`, to indicate which
 * record type is considered acceptable. Any other value effectively means that
 * only the more generic type `'edpoprec:Record'` is acceptable.
 * @param {object} domain - JSON-LD declaration of a single domain of a
 * property.
 * @returns {boolean} `true` if the domain matches `target` or if it is
 * `'edpoprec:Record'`, `false` otherwise.
 */
function domainFitsQualification(target, domain) {
    var match = domain['@id'].match(recordTypePattern);
    if (!match) return false;
    var qualified = match[1];
    var qualifier = match[2];
    return (!qualified || qualifier === target);
}

// The next comment only describes a type for JSDoc; it does not actually refer
// to any statement or object.
/**
 * Unary predicate over JSON-LD objects. Functions of this type can be used to
 * find or filter over arrays of such objects. One possible way to obtain such a
 * predicate function is by partially applying {@link domainFitsQualification}.
 * @callback ldObjectPredicate
 * @param {object} object - JSON-LD obhect to accept or reject.
 * @param {string} object['@id'] - JSON-LD objects must have an '@id' property
 * and the predicate is allowed to assume this.
 * @returns {boolean} `true` if the object is accepted, `false` otherwise.
 */

/**
 * Determine whether a given property has any domain matching the given
 * criterion. When the first argument is partially applied in advance, the
 * remaining function is suitable as a filtering criterion for a
 * {@link FilteredCollection}.
 * @param {ldObjectPredicate} criterion - Predicate against which the domains of the property should be matched.
 * @param {Backbone.Model} property - Model-wrapped JSON-LD representation of an
 * RDF property.
 * @returns {boolean} `true` if at least one domain of the property matches the criterion, `false` otherwise.
 */
function appliesToSuitableDomains(criterion, property) {
    var domain = property.get('rdfs:domain');
    if (!domain) return false;
    if (!domain.length) domain = [domain];
    return _.find(domain, criterion);
}

// Partial applications of the above two functions so we can use them for the
// filtered collections that we will define next.
var includesBiographical = _.partial(domainFitsQualification, 'Bio'),
    includesBibliographic = _.partial(domainFitsQualification, 'Biblio'),
    appliesToBiographies = _.partial(appliesToSuitableDomains,
                                     includesBiographical),
    appliesToBibliographs = _.partial(appliesToSuitableDomains,
                                      includesBibliographic);

/**
 * Subset of {@link properties} containing only the properties that apply to
 * biographical records.
 */
export var bioProperties = new FilteredCollection(properties, appliesToBiographies);

/**
 * Subset of {@link properties} containing only the properties that apply to
 * bibliographical records.
 */
export var biblioProperties = new FilteredCollection(properties, appliesToBibliographs);

/**
 * A list of all field types according to the record ontology.
 * This is hardcoded for now because there is no trivial way to infer this
 * by reasoning from the ontology JSON-LD file.
 * @type {string[]}
 */
export const fieldList = [
    'edpoprec:Field',
    'edpoprec:DatingField',
    'edpoprec:LanguageField',
    'edpoprec:LocationField',
];
