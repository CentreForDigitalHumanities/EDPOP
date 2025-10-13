import Backbone from 'backbone';
import { modelSlashUrl } from '@uu-cdh/backbone-util';
import { objectAsUrlParams } from './generic-functions';

/**
 * Generic subclass that appends a slash to the model URL.
 * This is required for interop with Django REST Framework.
 */
export var APIModel = Backbone.Model.extend({
    url: modelSlashUrl(),
});

/**
 * Generic subclass that supports filtering at the backend.
 */
export var APICollection = Backbone.Collection.extend({
    model: APIModel,
    query: function(options) {
        var url = options.url || this.url;
        var urlParts = [url, '?'];
        if (options.params) {
            urlParts.push(objectAsUrlParams(options.params));
        }
        var fetchOptions = _(options).omit(['params']).extend({
            url: urlParts.join(''),
        }).value();
        return this.fetch(fetchOptions);
    },
});
