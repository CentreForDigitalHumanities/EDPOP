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
