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
