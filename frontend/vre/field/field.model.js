import _ from 'lodash';
import Backbone from 'backbone';
import {
    canonicalSort,
    typeTranslation,
} from '../utils/generic-functions';
import {
    properties,
    biblioProperties,
    bioProperties,
} from "../utils/record-ontology";
import {getStringLiteral} from "../utils/jsonld.model";

/**
 * Get correction for a field value based on
 * @param {Object} value - the specific value to get the display of
 * @param {Field} field - the whole field object
 * @param {Annotations} [annotations] - annotations for the record
 * @returns {string|undefined}
 */
function getCorrectedTextForFieldValue(value, field, annotations) {
    if (!annotations) return undefined;
    var annotation;
    if (!value) {
        // Field missing in the source data: edpopcol:originalText should not be present
        annotation = annotations.find(x => {
            return x.get('edpopcol:field') === field.id && !x.get('edpopcol:originalText');
        });
    } else {
        // Field present in the source data: check if edpopcol:originalText matches
        annotation = annotations.find(x => {
            return x.get('edpopcol:field') === field.id && x.get('edpopcol:originalText') === value['edpoprec:originalText']
        });
    }
    if (annotation) {
        return annotation.get('oa:hasBody');
    }
}

/**
 * Get a default main display string of the `value` attribute of a
 * field flattened using {@link FlatterFields}. Currently, this is
 * the normalized "summary text" if available and otherwise the
 * original text from the source database. If there is a correction
 * for the field value, use that instead.
 * @param {Object} value - the specific value to get the display of
 * @param {Field} field - the whole field object
 * @param {Annotations} [annotations] - annotations for the field
 * @return {string}
 */
function getMainDisplayOfFieldValue(value, field, annotations = null) {
    var correctedText = getCorrectedTextForFieldValue(value, field, annotations);
    if (correctedText) return correctedText;
    return value['edpoprec:summaryText'] || value['edpoprec:originalText'];
}

// A single field of a single record.
export var Field = Backbone.Model.extend({
    idAttribute: 'key',
    /**
     * Get the default rendering of the field
     *
     * @param {Annotations} annotations - Optional annotations for the field
     * @return {string}
     */
    getMainDisplay(annotations = null) {
        // Currently, only normalizedText is supported.
        const value = this.get('value');
        if (!value) {
            // Field is missing in the source data: return annotation if present
            return getCorrectedTextForFieldValue(null, this, annotations) || '';
        } else if (_.isArray(value)) {
            // Field is repeated: concatenate all values
            return _.map(value, (value) => getMainDisplayOfFieldValue(value, this, annotations)).join(' ; ');
        } else {
            return getMainDisplayOfFieldValue(value, this, annotations);
        }
    },
    getFieldInfo() {
        const property = properties.get(this.id);
        if (property) {
            return {
                name: getStringLiteral(property.get("skos:prefLabel")),
                description: getStringLiteral(property.get("skos:description")),
            };
        } else {
            return {name: this.id};
        }
    },
    getLinkedUri() {
        var value = this.get('value');
        return value && value['edpoprec:authorityRecord'] && value['edpoprec:authorityRecord']['@id'];
    }
});

/**
 * Find the set of properties that apply to the given record.
 * Mostly an implementation detail of {@link FlatFields} and
 * {@link FlatterFields}.
 */
function selectProperties(record) {
    return (
        typeTranslation(record).isBibliographical ?
        biblioProperties : bioProperties
    );
}

/**
 * This is an alternative, flat representation of the fields in a given
 * option.record. Its purpose is to be easier to represent and manage from
 * a view.
 *
 * normal: {id, uri, content}
 * flat alternative: [{key, value}]
 *
 * Note that we extend directly from Backbone.Collection rather than from
 * APICollection and that we don't set a URL. This is because we only talk
 * to the server through the underlying Record model.
 */
export var FlatFields = Backbone.Collection.extend({
    model: Field,
    comparator: function(item) {
        return canonicalSort(item.attributes.key);
    },
    initialize: function(models, options) {
        _.assign(this, _.pick(options, ['record']));
        const fields = this.toFlat(this.record);
        this.set(fields);
        // Do the above line again when the record changes.
        this.listenTo(this.record, 'change', _.flow([this.toFlat, this.set]));
    },
    toFlat: function(record) {
        const properties = selectProperties(record);
        const fields = properties.map(prop => ({
            key: prop.id,
            value: record.get(prop.id),
        }));
        return fields;
    },
});

/**
 * Like {@link FlatFields}, but even flatter: if a field is repeated, every
 * value is represented with a separate `{key, value}` pair.
 * @class
 */
export var FlatterFields = FlatFields.extend({
    modelId: function(fieldAttrs) {
        const value = fieldAttrs.value;
        const id = value && value['@id'];
        return `${fieldAttrs.key} -- ${id}`;
    },
    toFlat: function(record) {
        const properties = selectProperties(record);
        return properties.reduce((fields, prop) => {
            let value = record.get(prop.id);
            if (!value) return fields.concat({key: prop.id, value: value});
            if (!_.isArray(value)) value = [value];
            return fields.concat(_.map(value, v => ({key: prop.id, value: v})));
        }, []);
    },
});
