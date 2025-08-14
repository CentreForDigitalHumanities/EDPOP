import _ from "lodash";
import {APICollection} from "./api.model";

/**
 * The @graph property inside JSON-LD
 * @typedef {Object} JSONLDGraph
 */

/**
 * An individual subject definition inside JSON-LD
 * @typedef {Object} JSONLDSubject
 */


/**
 * Get a string literal from JSON-LD. This function probes whether the literal
 * is of xsd:string or rdf:langString format and if multiple string literals
 * are given. In the latter case, return only one string with a preference
 * for an rdf:langString that matches the user interface's language.
 * If no string literal is found, return null.
 * @param literalObject
 * @return {?string}
 */
export function getStringLiteral(literalObject) {
    // If the property occurs multiple time, literalObject is an array. Normalize to array.
    if (!Array.isArray(literalObject)) {
        literalObject = [literalObject];
    }
    return literalObject.reduce((agg, item) => {
        if (typeof item === "string" && agg === null) {
            // If a string (data type xsd:string), only prefer this value if no other value was chosen yet.
            return item;
        } else if (typeof(item) === "object" && Object.hasOwn(item, "@language") && Object.hasOwn(item, "@value")) {
            // This is a language-tagged string. Prefer it if no other value was chosen yet, OR if it matches
            // the language of the user interface. Only support English for now.
            const language = item["@language"];
            if (agg === null || language.startsWith("en")) {
                return item["@value"];
            }
        } else {
            return agg;
        }
    }, null);
}

/**
 * Check whether the given literal is of the given data type.
 * @param literalObject - the object to be checked
 * @param expectedType - the expected XSD type (part after xsd:)
 * @returns {boolean}
 */
function hasDataType(literalObject, expectedType) {
    if (expectedType === "string")
        return typeof literalObject === "string";
    return typeof literalObject === "object" && Object.hasOwn(literalObject, "@type") && literalObject["@type"] === "http://www.w3.org/2001/XMLSchema#" + expectedType;
}

/**
 * Get a date literal from JSON-LD. This function probes whether the literal
 * is of xsd:string or xsd:date format and tries to return a Date object.
 * If the date cannot be reliably parsed, return null.
 * @param literalObject
 * @return {?Date}
 */
export function getDateLiteral(literalObject) {
    if (hasDataType(literalObject, "date")) {
        return new Date(literalObject["@value"]);
    } else {
        return null;
    }
}

export function getDateTimeLiteral(literalObject) {
    if (hasDataType(literalObject, "dateTime")) {
        return new Date(literalObject["@value"]);
    } else {
        return null;
    }
}

export var JsonLdModel = Backbone.Model.extend({
    idAttribute: '@id',
    parse: function(response) {
        if (!response['@context']) {
            // Response is a partial parse by JsonLdNestedCollection; ignore
            return response;
        } else {
            var allSubjects;
            if (!response.hasOwnProperty("@graph")) {
                console.warn("Response has no @graph key; assuming that it is in compacted form.");
                allSubjects = [response];
            } else {
                allSubjects = response["@graph"];
            }
            var completeSubjects = enforest(allSubjects, true);
            return completeSubjects[0];
        }
    }
});

/**
 * Generic subclass of APICollection that parses incoming compacted JSON-LD to an
 * array of all subjects. The contents of subjects are left unchanged.
 */
export var JsonLdCollection = APICollection.extend({
    model: JsonLdModel,
    parse: function(response) {
        if (!response.hasOwnProperty("@graph")) {
            console.warn("Response has no @graph key; assuming that it is in compacted form.");
            return [response];
        }
        return response["@graph"];
    }
});

/**
 * Return a nested version of each given subject by adding to it the objects it
 * refers to if they are found in the graph.
 * The subjects passed to this function as an argument are not changed.
 * The name of this function refers to the opposite of "deforestation".
 * @param {JSONLDSubject[]} subjects - The subjects to create nested versions of
 * @param {boolean} [toplevelOnly=false] - Indicates whether to return nested
 * versions of all subjects (false, default), or only the ones that are not
 * contained in other subjects (true).
 * @returns {JSONLDSubject[]} Nested versions of the subjects that were passed
 * in.
 */
export function enforest(subjects, toplevelOnly) {
    // TODO substitute _.indexBy for Underscore
    const subjectsByID = _.keyBy(subjects, '@id');
    const nested = {}, internal = {};

    function nest(subject) {
        if (!_.has(subject, '@id')) return subject;
        const id = subject['@id'];
        if (!(id in nested) && (id in subjectsByID)) {
            nested[id] = subject; // this prevents infinite recursion
            nested[id] = _.mapValues(subjectsByID[id], nestProperty);
        }
        return nested[id] || subject;
    }

    function nestProperty(value) {
        if (_.isArray(value)) return _.map(value, nestProperty);
        if (_.has(value, '@list')) return _.mapValues(value, nestProperty);
        if (_.has(value, '@id')) internal[value['@id']] = true;
        return nest(value);
    }

    const completeSubjects = _.map(subjects, nest);
    if (toplevelOnly) {
        const isToplevel = subject => !(subject['@id'] in internal);
        return _.filter(completeSubjects, isToplevel);
    }
    return completeSubjects;
}

/**
 * Generic subclass of APICollection that parses incoming compacted JSON-LD to an
 * array of subjects that are of RDF class `targetClass`. If these subjects
 * refer to other objects, these are nested
 */
export var JsonLdNestedCollection = APICollection.extend({
    model: JsonLdModel,
    /**
     * The RDF class (as it is named in JSON-LD) of which nested subjects have
     * to be put in the collection array when incoming data is parsed. If left
     * undefined, all top-level subjects are included and all internal resources
     * are omitted.
     * @type {string}
     */
    targetClass: undefined,
    parse: function(response) {
        let allSubjects = response["@graph"];
        if (!response.hasOwnProperty("@graph")) {
            console.warn("Response has no @graph key; assuming that it is in compacted form.");
            allSubjects = [response];
        }
        const completeSubjects = enforest(allSubjects, !this.targetClass);
        if (!this.targetClass) return completeSubjects;
        return _.filter(completeSubjects, {'@type': this.targetClass});
    }
})

/**
 * Generic subclass of APICollection that parses incoming compacted JSON-LD to an
 * ordered array of subjects according to the information of the
 * `OrderedCollection` entity (ActivityStreams ontology) from the same graph.
 * Sets the `totalResults` attribute if available.
 * The graph should contain exactly one `OrderedCollection`.
 * @class
 */
export var JsonLdWithOCCollection = APICollection.extend({
    model: JsonLdModel,
    /**
     * The total number of results. This is filled by `parse` if the
     * `OrderedCollection` subject comes with `totalItems`.
     * @type {?number}
     */
    totalResults: undefined,
    /**
     * The prefix, used in JSON-LD, for the ActivityStreams namespace.
     * Defaults to `as:` but can be overridden.
     * @type {string}
     */
    activityStreamsPrefix: "as:",
    parse: function(response) {
        // Get all subjects of the graph with their predicates and objects as an array
        if (!response.hasOwnProperty("@graph")) {
            throw "Response has no @graph key, is this JSON-LD in compacted form?";
        }
        const allSubjects = response["@graph"];
        const completeSubjects = enforest(allSubjects);
        const as = this.activityStreamsPrefix;
        const ocType = `${as}OrderedCollection`;
        const orderedCollection = _.find(completeSubjects, {"@type": ocType});
        this.totalResults = orderedCollection[`${as}totalItems`];
        const orderedItems = orderedCollection[`${as}orderedItems`]["@list"]
        return orderedItems || [];
    }
});
