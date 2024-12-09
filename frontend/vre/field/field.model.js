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

// A single field of a single record.
export var Field = Backbone.Model.extend({
    idAttribute: 'key',
    /**
     * Get the default rendering of the field
     * @return {string}
     */
    getMainDisplay() {
        // Currently, only normalizedText is supported.
        return this.get('value')['edpoprec:originalText'];
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
        const properties = (
            typeTranslation(record).isBibliographical ?
            biblioProperties : bioProperties
        );
        const fields = properties.map(prop => ({
            key: prop.id,
            value: record.get(prop.id),
        }));
        return fields;
    },
});
