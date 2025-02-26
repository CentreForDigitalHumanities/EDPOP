import _ from 'lodash';
import Backbone from 'backbone';
import {
    canonicalSort,
    typeTranslation,
} from '../utils/generic-functions';
import {
    fieldList,
    properties,
    biblioProperties,
    bioProperties,
} from "../utils/record-ontology";
import {getStringLiteral} from "../utils/jsonld.model";

/**
 * Get a default main display string of the `value` attribute of a
 * field flattened using {@link FlatterFields}. Currently, this is
 * the normalized "summary text" if available and otherwise the
 * original text from the source database.
 * @param {object} value
 * @return {string}
 */
function getMainDisplayOfFieldValue(value) {
    return value['edpoprec:summaryText'] || value['edpoprec:originalText'];
}

// A single field of a single record.
export var Field = Backbone.Model.extend({
    idAttribute: 'key',
    /**
     * Get the default rendering of the field
     * @return {string}
     */
    getMainDisplay() {
        // Currently, only normalizedText is supported.
        const value = this.get('value');
        if (!value) return value;
        if (_.isArray(value)) {
            return _.map(value, getMainDisplayOfFieldValue).join(' ; ');
        }
        return getMainDisplayOfFieldValue(value);
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
