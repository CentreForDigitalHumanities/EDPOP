import _ from 'lodash';
import { Collection } from 'backbone';
import { deriveMapped } from '@uu-cdh/backbone-collection-transformers';

/**
 * @class
 * @extends Collection
 */
export var MappedCollection = deriveMapped();

function clone(model) {
    return model.clone();
}

// MappedCollection is not clonable by default. In our case, it is useful to
// have a deep copy feature available.
/**
 * Create a deep copy of the models in the collection.
 * @returns {Collection} A plain (i.e., non-mapped, non-proxy) collection that
 * has no ties to the original mapped or collection or its underlying
 * collection.
 */
MappedCollection.prototype.clone = function() {
    var clonedModels = this.map(clone);
    return new Collection(clonedModels);
}

// Temporary workaround for backbone-collection-transformers#4.
MappedCollection.prototype.proxyUpdate = function(collection, options) {
    // Some models in the underlying collection were added, changed or removed.
    // The affected models are listed in arrays with corresponding names in the
    // options.changes object: `{added: [], changed: [], removed: []}`.
    var rawChanges = options && options.changes;
    // If this assumption is violated, this method might have been called in
    // another context than as a handler to the update event. We may as well
    // skip the rest of the method.
    if (!rawChanges) return;
    // We want to echo the update event, but where possible, report the mapped
    // models that were affected rather than the underlying models. We can only
    // do this for the added and changed models, because the mapped collection
    // no longer contains counterparts to the removed models by the time this
    // handler is invoked.
    var mappedChanges = {removed: rawChanges.removed};
    var getMapped = this.getMapped.bind(this);
    _.each(['added', 'changed'], function(category) {
        mappedChanges[category] = _.map(rawChanges[category], getMapped);
    });
    var mappedOptions = _.defaults({changes: mappedChanges}, options);
    this.trigger('update', this, mappedOptions);
};

MappedCollection.prototype.initialize = function(models, options) {
    this.listenTo(this._underlying, 'update', this.proxyUpdate);
};
