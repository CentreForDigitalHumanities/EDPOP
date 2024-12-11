import { Collection } from 'backbone';
import { deriveFiltered } from '@uu-cdh/backbone-collection-transformers';

/**
 * @class
 * @extends Collection
 */
export var FilteredCollection = deriveFiltered();
