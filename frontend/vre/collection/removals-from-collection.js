import Backbone from 'backbone';

export var RemovalsFromCollection = Backbone.Model.extend({
    url: '/api/remove-selection/',
});
