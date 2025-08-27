//import Backbone from 'backbone';
import { JsonLdModel, JsonLdCollection } from '../utils/jsonld.model'
import { Records } from '../record/record.model.js';

/**
 * Representation of a single VRE collection.
 */
export var VRECollection = JsonLdModel.extend({
    idAttribute: 'uri',
    getRecords: function(reload=false) {
        if (!reload && this.records) return this.records;
        var records = this.records = new Records();
        records.url = `/api/collection-records/${encodeURIComponent(this.id)}/`;
        records.fetch().then(function() {
            records.trigger('complete');
        });
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
