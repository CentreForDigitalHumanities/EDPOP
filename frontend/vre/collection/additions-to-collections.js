import Backbone from 'backbone';

import { vreChannel } from '../radio.js';

export var AdditionsToCollections = Backbone.Model.extend({
    url: '/api/add-selection/',
    save: function(attributes, options) {
        var promise = AdditionsToCollections.__super__.save
            .call(this, attributes, options);
        promise.then(this.broadcast.bind(this, options.records));
        return promise;
    },
    broadcast: function(records) {
        vreChannel.trigger('collections:added', this, records);
    },
});
