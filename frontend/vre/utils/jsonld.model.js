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

export var JsonLdModel = Backbone.Model.extend({
    idAttribute: '@id',
});

/**
 * Generic subclass of APICollection that parses incoming compacted JSON-LD to an
 * array of all subjects. The contents of subjects are left unchanged.
 */
export var JsonLdCollection = APICollection.extend({
    model: JsonLdModel,
    parse: function(response) {
        if (!response.hasOwnProperty("@graph")) {
            throw "Response has no @graph key, is this JSON-LD in compacted form?";
        }
        return response["@graph"];
    }
});

/**
 * Return a nested version of a given subject by adding to it the objects
 * it refers to if they are found in the graph.
 * The subject passed to this function as an argument is not changed.
 * @param subjectsByID{Dictionary<JSONLDSubject>} - The full contents of the graph in JSON-LD
 * @param subject{JSONLDSubject} - The subject including its predicates and objects to create a nested version of
 * @returns {Object}
 */
export function nestSubject(subjectsByID, subject) {
    const parentSubjectIDs = [];

    function nest(subject) {
        if (!_.has(subject, "@id")) return subject;
        const id = subject["@id"];
        const dereferenced = subjectsByID[id];
        if (!dereferenced) return subject;
        if (_.includes(parentSubjectIDs, id)) return subject;
        parentSubjectIDs.push(id);
        const transformedSubject = _.mapValues(dereferenced, nestProperty);
        parentSubjectIDs.pop();
        return transformedSubject;
    }

    function nestProperty(value) {
        if (_.isArray(value)) return _.map(value, nest);
        return nest(value);
    }

    return nest(subject);
}

/**
 * Generic subclass of APICollection that parses incoming compacted JSON-LD to an
 * array of subjects that are of RDF class `targetClass`. If these subjects
 * refer to other objects, these are nested
 */
export var JsonLdNestedCollection = APICollection.extend({
    model: JsonLdModel,
    /**
     * The RDF class (as it is named in JSON-LD) of which nested subjects have to be
     * put in the collection array when incoming data is parsed.
     * @type {string}
     */
    targetClass: undefined,
    parse: function(response) {
        if (!response.hasOwnProperty("@graph")) {
            throw "Response has no @graph key, is this JSON-LD in compacted form?";
        }
        if (typeof this.targetClass === "undefined") {
            throw "targetClass should not be undefined"
        }
        const allSubjects = response["@graph"];
        const subjectsByID = _.keyBy(allSubjects, '@id'); // NOTE: change to indexBy when migrating to underscore
        const targetedSubjectIDs = allSubjects.filter(subject => subject["@type"] === this.targetClass).map(subject => subject["@id"]);
        return targetedSubjectIDs.map(subjectID => nestSubject(subjectsByID, subjectsByID[subjectID]));
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
        const ocType = `${this.activityStreamsPrefix}OrderedCollection`;
        const orderedCollection = _.find(allSubjects, {"@type": ocType});
        this.totalResults = orderedCollection[`${this.activityStreamsPrefix}totalItems`];
        const orderedItems = orderedCollection[`${this.activityStreamsPrefix}orderedItems`]["@list"]
        let result;
        if (typeof orderedItems === "undefined") {
            // @list is not present; the list is empty
            result = [];
        } else {
            const subjectsByID = _.keyBy(allSubjects, '@id'); // NOTE: change to indexBy when migrating to underscore
            result = orderedItems.map((subject) => {
                const orderedSubject = subjectsByID[subject["@id"]];
                return nestSubject(subjectsByID, orderedSubject);
            });
        }
        return result;
    }
});
