//import Backbone from 'backbone';
import { JsonLdModel, JsonLdCollection } from '../utils/jsonld.model'
import { Records } from '../record/record.model.js';

/**
 * Representation of a single VRE collection.
 */
export var VRECollection = JsonLdModel.extend({
    idAttribute: 'uri',
    loaded: false,
    getRecords: function(reload=false) {
        if (!reload && this.records) {
            this.loaded = true;
            return this.records;
        }
        var records = this.records = new Records();
        records.url = `/api/collection-records/${encodeURIComponent(this.id)}/`;
        records.fetch().then(function() {
            this.loaded = true;
            records.trigger('complete');
        }.bind(this));
        return records;
    },
});

export var VRECollections = JsonLdCollection.extend({
    url: '/api/collections/',
    model: VRECollection,
}, {
    /**
     * Class method for retrieving only the collections the user can manage.
     */
    mine: function(myCollections) {
        myCollections = myCollections || new VRECollections();
        myCollections.fetch();
        return myCollections;
    },
});
