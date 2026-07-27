import _ from 'lodash';
import { Collection } from 'backbone';
import { deriveFiltered } from '@uu-cdh/backbone-collection-transformers';

/**
 * @class
 * @extends Collection
 */
export var FilteredCollection = deriveFiltered();

// Temporary workaround for backbone-collection-transformers#2.
FilteredCollection.prototype.modelId = function(attrs, idAttribute) {
    return this._underlying.modelId(attrs, idAttribute);
};

// Temporary workaround for backbone-collection-transformers#4.
FilteredCollection.prototype.proxyUpdate = function(collection, options) {
    // Some models in the underlying collection were added, changed or removed.
    // The affected models are listed in arrays with corresponding names in the
    // options.changes object: `{added: [], changed: [], removed: []}`.
    var rawChanges = options && options.changes;
    // If this assumption is violated, this method might have been called in
    // another context than as a handler to the update event. We may as well
    // skip the rest of the method.
    if (!rawChanges) return;
    // We want to trigger an update event, too, but only if some of the affected
    // models are also present in the filtered collection.
    var affectedOnly = _.partial(_.filter, _, this.matches);
    // TODO: replace mapValues by mapObject when switching to Underscore
    var filteredChanges = _.mapValues(rawChanges, affectedOnly);
    if (_.every(filteredChanges, _.isEmpty)) return;
    // Forward the event, but only report on the affected models that match the
    // filter criterion.
    var filteredOptions = _.defaults({changes: filteredChanges}, options);
    this.trigger('update', this, filteredOptions);
};

FilteredCollection.prototype.initialize = function(models, options) {
    this.listenTo(this._underlying, 'update', this.proxyUpdate);
};
