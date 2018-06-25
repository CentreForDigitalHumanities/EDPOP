import {Backbone} from 'backbone';

// A single field of a single record.
export var Field = Backbone.Model.extend({
    idAttribute: 'key',
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
        if (this.record.has('content')) this.set(this.toFlat(this.record));
        // Do the above line again when the record changes.
        this.listenTo(this.record, 'change', _.flow([this.toFlat, this.set]));
    },
    toFlat: function(record) {
        return _.map(record.get('content'), function(value, key) {
            return {key: key, value: value};
        });
    },
});
