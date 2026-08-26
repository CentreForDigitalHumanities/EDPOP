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

/**
 * Original value of a field in a record.
 * @class
 * @extends Backbone.Model
 */
export var Field = Backbone.Model.extend(/**
                                          * @lends Field.prototype
                                          */{
    /**
     * @member {string} #attributes.key
     * @description IRI (prefixed name) of the field.
     */
    /**
     * @member {string|string[]} #attributes.value
     * @description Original value(s) for the field in the given record.
     */

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
 * @class
 * @extends Backbone.Collection
 */
export var FlatFields = Backbone.Collection.extend(/**
                                                    * @lends FlatFields.prototype
                                                    */{
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
 * @extends FlatFields
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

/**
 * Internal helper for extracting original text values from flattened fields.
 * @param {Field} model - Instance to retrieve original text from.
 * @returns {string} The original text.
 */
function valueAttribute(model) {
    return model.get('value')['edpoprec:originalText'];
}

/**
 * Internal helper for extracting the original text part of the selector of an
 * {@link Annotation}.
 * @param {Annotation} correction - Instance to retrieve `edpopcol:originalText`
 * from.
 * @returns {string} Content of the original text selector.
 */
function originalTextSelector(correction) {
    return correction.get('edpopcol:originalText');
}

// Order in which we want to display different types of values in the view.
const fieldEntryTypeOrder = [
    'originalValue',
    'deletion',
    'danglingDeletion',
    'correction',
    'danglingCorrection',
    'addition',
    'wholeField',
];

const alphabet = 'abcdefghijklmnopqrstuvwxyz';

/**
 * Object of the form `{tagname: letter}`. The tag names are used as mnemonics,
 * the letters are used as a string prefix for sorting purposes.
 * @type {Object.<string, string>}
 */
export const fieldEntryTag = _.chain(fieldEntryTypeOrder)
    .invert()
    .mapValues(_.propertyOf(alphabet))
    .value();

/**
 * Attributes for {@link CombinedFieldValues#model} representing an original
 * field value, correction, deletion, addition, or the field as a whole. The
 * latter variant exists purely as a slot that the user can interact with in
 * order to create more additions.
 * @typedef {Object} RecordFieldValueAttributes
 * @property {string} id - Composition of the original text and/or the
 * corrected/added value, if applicable. Prefixed field IRI if neither is
 * applicable, i.e., if representing the field as a whole.
 * @property {string} order - String prefix from {@link fieldEntryTag} for
 * sorting purposes.
 * @property {Field} [original] - Original value in the record, either as the
 * target of representation or as referenced from the edit. May be `undefined`
 * in case of a dangling edit.
 * @property {Annotation} [edit] - Correction, addition or deletion. If present,
 * this is the target of representation.
 * @property {string} [originalText] - Convenience copy of
 * `original.get('value')['edpoprec:originalText']` if present, or
 * `edit.get('edpopcol:originalText')` in case of a dangling edit.
 * @property {string} [correctedText] - Added or corrected value if applicable.
 * Convenience copy of `edit.get('oa:hasBody')`.
 * @property {boolean} [dangling] - `true` if the edit refers to a value that is
 * no longer present in the original record.
 * @property {boolean} [uncorrected] - `true` if the instance represents an
 * unedited original value in the record. Mutually exclusive with `deletion`,
 * `correction`, `addition` and `field`.
 * @property {boolean} [deletion] - `true` if the instance represents an edit
 * that marks an original value as deleted. May be dangling if the marked value
 * is no longer present in the original record. Mutually exclusive with
 * `uncorrected`, `correction`, `addition` and `field`.
 * @property {boolean} [correction] - `true` if the instance represents an edit
 * that changes an original value into something else. May be dangling if the
 * marked value is no longer present in the original record. Mutually exclusive
 * with `uncorrected`, `deletion`, `addition` and `field`.
 * @property {boolean} [addition] - `true` if the instance represents an edit
 * that adds a separate new value. Mutually exclusive with `uncorrected`,
 * `deletion`, `correction` and `field`.
 * @property {boolean} [field] - `true` if the instance represents the field as
 * a whole. Mutually exclusive with `uncorrected`, `deletion`, `correction` and
 * `addition`.
 */

/**
 * Convert an original value to presentation attributes.
 * @param {Field} original
 * @returns {RecordFieldValueAttributes}
 */
function wrapUncorrected(original) {
    var originalText = original.get('value')['edpoprec:originalText'];
    return {
        id: originalText,
        uncorrected: true,
        order: fieldEntryTag.originalValue,
        original,
        originalText,
    };
}

/**
 * Convert a correction or deletion to presentation attributes.
 * @param {Array} pair - Tuple of an original value and an edit.
 * @param {Field} pair[0] - Original value.
 * @param {Annotation} pair[1] - Edit.
 * @returns {RecordFieldValueAttributes}
 */
function wrapCorrection(pair) {
    const original = pair[0];
    const edit = pair[1];
    const originalText = originalTextSelector(edit);
    if (edit.get('marksDeletion')) return {
        id: originalText + ' →',
        deletion: true,
        dangling: !original,
        edit,
        order: (
            original ? fieldEntryTag.deletion
                     : fieldEntryTag.danglingDeletion
        ),
        original,
        originalText,
    };
    const correctedText = edit.get('oa:hasBody');
    return {
        id: originalText + ' → ' + correctedText,
        correction: true,
        dangling: !original,
        edit,
        order: (
            original ? fieldEntryTag.correction
                     : fieldEntryTag.danglingCorrection
        ),
        original,
        originalText,
        correctedText,
    };
}

/**
 * Convert an addition to presentation attributes.
 * @param {Annotation} edit
 * @returns {RecordFieldValueAttributes}
 */
function wrapAddition(edit) {
    const addedValue = edit.get('oa:hasBody');
    return {
        id: '→ ' + addedValue,
        addition: true,
        edit,
        order: fieldEntryTag.addition,
        correctedText: addedValue,
    };
}

/**
 * Common properties of {@link CombinedFieldValues} and {@link RecordField}.
 * Also passed in options to the `RecordField` constructor.
 * @interface RecordFieldData
 */
/**
 * Original values of the current field in the current record.
 * @member {FilteredCollection<FlatterFields>} RecordFieldData#values
 */
/**
 * Edits made on the current field in the current record.
 * @member {FilteredCollection<Annotations>} RecordFieldData#annotations
 */

/**
 * Presentation-oriented collection with the field values and edits for a single
 * field of a given record.
 * @class
 * @extends Backbone.Collection
 * @implements {RecordFieldData}
 */
export var CombinedFieldValues = Backbone.Collection.extend(/**
                            @lends CombinedFieldValues.prototype
                                                             */{
    comparator: function(model) {
        return model.get('order') + model.id;
    },

    /**
     * ID that coincides with the ID of the current field.
     * @member {string} id
     */
    /**
     * @member model
     * @class
     * @extends Backbone.Model
     */
    /**
     * @member {RecordFieldValueAttributes} model#attributes
     */

    /**
     * @param {FieldValue[]} [models]
     * @param {Object} options
     * @param {RecordField} options.recordField - Model representing the
     * combination of record and field for which the values and edits are to be
     * computed.
     */
    initialize: function(models, options) {
        /** @member {RecordField} */
        this.recordField = options.recordField;
        _.assign(this, _.pick(options.recordField, ['values', 'annotations', 'id']));
        this.combineValues()
            // Why change and not just update? Because of Backbone#4306.
            .listenTo(this.values, 'update change', this.combineValues)
            .listenTo(this.annotations, 'update change', this.combineValues)
            .trackFirst()
            .on('update', this.trackFirst);
    },

    /**
     * Recompute the contents of the collection, i.e., all attributes of all
     * models, based on the current {@link #values} and {@link #annotations}.
     * @listens #values~event:update
     * @listens #annotations~event:update
     * @returns {CombinedFieldValues} this
     */
    combineValues: function() {
        // Create an index to find original values by their `originalText`.
        // TODO replace keyBy by indexBy when moving to Underscore
        // (will be able to use Collection#indexBy)
        const originalIndex = _.keyBy(this.values.models, valueAttribute);
        const getOriginal = _.propertyOf(originalIndex);
        // Group the edits by which `originaText` they reference.
        const annotationTiers = this.annotations.groupBy('edpopcol:originalText');
        const getAnnotations = _.propertyOf(annotationTiers);
        // List just the original values that have edits.
        const referencedOriginals = _.chain(annotationTiers)
              .omit('undefined').keys().value();
        // Version of the original value index without the edited values.
        const uncorrectedOriginals = _.omit(originalIndex, referencedOriginals);
        // Edits that correct or delete-mark an original value.
        const corrections = _.chain(referencedOriginals)
              .map(getAnnotations).flatten().value();
        // Additions are edits not associated with an original value.
        const additions = annotationTiers['undefined'];
        // Original values with edits, in the same order as they appear in
        // `corrections`. This array may contain duplicates.
        const correctedOriginals = _.chain(corrections)
              .map(originalTextSelector)
              .map(getOriginal).value();
        // Make pairs of edits with their originals so we can pass them to
        // `wrapCorrection` together.
        const correctionPairs = _.zip(correctedOriginals, corrections);
        // Combine everything into a big array of `RecordFieldValueAttributes`.
        // We always include one entry for the field as a whole.
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

    /**
     * Ensure that the first model in the collection has an `{isFirst: true}`
     * attribute and that the other models lack this attribute.
     * @listens ~event:update
     * @returns {CombinedFieldValues} this
     */
    trackFirst: function() {
        if (this._first === this.first()) return this;
        if (this._first) this._first.unset('isFirst');
        this._first = this.first();
        if (this._first) this._first.set('isFirst', true);
        return this;
    },
});

/**
 * @typedef {Object} RecordFieldAttributes
 * @property {module:'../utils/jsonld.model.js'.JsonLdModel} field
 * @property {module:'../record/record.model.js'.Record} record
 */

/**
 * Presentation-oriented model representing a specific field within a specific
 * record.
 * @class
 * @extends Backbone.Model
 * @implements {RecordFieldData}
 */
export var RecordField = Backbone.Model.extend(/**
                                                * @lends RecordField.prototype
                                                */{
    /**
     * @param {RecordFieldAttributes} attributes
     * @param {RecordFieldData} options
     */
    initialize: function(attributes, options) {
        var field = this.get('field');
        if (field) this.set('id', field.id);
        this.values = new FilteredCollection(options.values, {
            key: this.id,
        });
        this.annotations = new FilteredCollection(options.annotations, {
            'edpopcol:field': this.id,
        });
        /** @member {CombinedFieldValues} */
        this.content = new CombinedFieldValues(null, {recordField: this});
    },

    fieldInfo() {
        const field = this.get('field');
        return {
            name: getStringLiteral(field.get("skos:prefLabel")),
            description: getStringLiteral(field.get("skos:description")),
        };
    },
});

/**
 * Given a record with associated data, generate a callback that maps a given
 * field from the `edpoprec:` ontology to the corresponding {@link RecordField}.
 * @param {module:'../record/record.model.js'.Record} record
 * @param {FlatterFields} values
 * @param {Annotations} annotations
 * @returns {field2recordField~curried}
 */
function field2recordField(record, values, annotations) {
    /**
     * @callback field2recordField~curried
     * @param {JsonLdModel} field - Field property from the `edpoprec:`
     * ontology.
     * @returns {RecordField}
     */
    return function(field) {
        return new RecordField({field, record}, {values, annotations});
    };
}

/**
 * Given a record, generate a matching collection of {@link RecordField} for
 * each applicable field from the `edpoprec:` ontology.
 * @param {module:'../record/record.model.js'.Record} record
 * @returns {RecordFields}
 */
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

/**
 * Collection of {@link RecordField} models with additional properties, intended
 * as a comprehensive datastructure containing all information a view might need
 * to render a record's fields and edits.
 * @typedef {Backbone.Collection} RecordFields
 */
/**
 * @member RecordFields#model
 * @class
 * @extends RecordField
 */
/**
 * @member {module:'../record/record.model.js'.Record} RecordFields#record
 */
/**
 * @member {FlatterFields} RecordFields#values
 */
/**
 * @member {Annotations} RecordFields#annotations
 */
