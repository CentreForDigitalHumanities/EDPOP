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
import { FilteredCollection } from '../utils/filtered.collection.js';
import { MappedCollection } from '../utils/mapped.collection.js';

function annotationMatchesField(field, value) {
    var originalText = value && value['edpoprec:originalText'];
    return function(anno) {
        if (anno.get('edpopcol:field') !== field.id) return false;
        var annoText = anno.get('edpopcol:originalText');
        return originalText == null ? !annoText : annoText === originalText;
    };
}

/**
 * Get correction for a field value based on
 * @param {Object} value - the specific value to get the display of
 * @param {Field} field - the whole field object
 * @param {Annotations} [annotations] - annotations for the record
 * @returns {string|undefined}
 */
function getCorrectedTextForFieldValue(value, field, annotations) {
    if (!annotations) return undefined;
    var annotation = annotations.find(annotationMatchesField(field, value));
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
            if (!value) return fields;
            if (!_.isArray(value)) value = [value];
            return fields.concat(_.map(value, v => ({key: prop.id, value: v})));
        }, []);
    },
});

function valueAttribute(model) {
    return model.get('value')['edpoprec:originalText'];
}

function originalTextSelector(correction) {
    return correction.get('edpopcol:originalText');
}

const fieldEntryTypeOrder = [
    'originalValue',
    'correction',
    'danglingCorrection',
    'addition',
    'wholeField',
];

const alphabet = 'abcdefghijklmnopqrstuvwxyz';

export const fieldEntryTag = _.chain(fieldEntryTypeOrder)
    .invert()
    .mapValues(_.propertyOf(alphabet))
    .value();

function wrapUncorrected(original) {
    return {
        id: original.get('value')['edpoprec:originalText'],
        uncorrected: true,
        order: fieldEntryTag.originalValue,
        original,
    };
}

function wrapCorrection(pair) {
    const original = pair[0];
    const correction = pair[1];
    const originalText = originalTextSelector(correction);
    const correctedText = correction.get('oa:hasBody');
    return {
        id: originalText + ' → ' + correctedText,
        correction,
        order: (
            original ? fieldEntryTag.correction
                     : fieldEntryTag.danglingCorrection
        ),
        original,
        originalText,
        correctedText,
    };
}

function wrapAddition(addition) {
    const addedValue = addition.get('oa:hasBody');
    return {
        id: '→ ' + addedValue,
        addition,
        order: fieldEntryTag.addition,
        addedValue,
    };
}

export var CombinedFieldValues = Backbone.Collection.extend({
    comparator: function(model) {
        return model.get('order') + model.id;
    },

    initialize: function(models, options) {
        _.assign(this, _.pick(options.recordField, ['values', 'annotations', 'id']));
        this.combineValues()
            // Why change and not just update? Because of Backbone#4306.
            .listenTo(this.values, 'update change', this.combineValues)
            .listenTo(this.annotations, 'update change', this.combineValues);
    },

    combineValues: function() {
        // TODO replace keyBy by indexBy when moving to Underscore
        // (will be able to use Collection#indexBy and 'value' shorthand)
        const originalIndex = _.keyBy(this.values.models, valueAttribute);
        const getOriginal = _.propertyOf(originalIndex);
        const annotationTiers = this.annotations.groupBy('edpopcol:originalText');
        const getAnnotations = _.propertyOf(annotationTiers);
        const referencedOriginals = _.chain(annotationTiers)
              .omit('undefined').keys().value();
        const uncorrectedOriginals = _.omit(originalIndex, referencedOriginals);
        const corrections = _.chain(referencedOriginals)
              .map(getAnnotations).flatten().value();
        const additions = annotationTiers['undefined'];
        const correctedOriginals = _.chain(corrections)
              .map(originalTextSelector)
              .map(getOriginal).value();
        const correctionPairs = _.zip(correctedOriginals, corrections);
        const allAttributes = [
            {id: this.id, field: true, order: fieldEntryTag.wholeField},
        ].concat(
            _.map(uncorrectedOriginals, wrapUncorrected),
            _.map(correctionPairs, wrapCorrection),
            _.map(additions, wrapAddition),
        );
        this.set(allAttributes);
        return this;
    },
});

export var RecordField = Backbone.Model.extend({
    initialize: function(attributes, options) {
        var field = this.get('field');
        if (field) this.set('id', field.id);
        this.values = new FilteredCollection(options.values, {
            key: this.id,
        });
        this.annotations = new FilteredCollection(options.annotations, {
            'edpopcol:field': this.id,
        });
        this.content = new CombinedFieldValues(null, {recordField: this});
    },
});

function field2recordField(record, values, annotations) {
    return function(field) {
        return new RecordField({field, record}, {values, annotations});
    };
}

export function presentableContents(record) {
    const values = new FlatterFields(null, {record});
    const annotations = record.getAnnotations();
    const fields = selectProperties(record);
    const contents = new MappedCollection(
        fields,
        field2recordField(record, values, annotations)
    );
    _.assign(contents, {record, values, annotations});
    return contents;
}
