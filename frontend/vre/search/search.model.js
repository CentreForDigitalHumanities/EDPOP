import { Record } from '../record/record.model';
import { JsonLdWithOCCollection } from "../utils/jsonld.model";

export var SearchResults = JsonLdWithOCCollection.extend({
    url: '/api/catalogs/search/',
    model: Record,
    toTabularData: function() {
        const data = this.map((record) => {
            return record.toTabularData();
        });
        return data;
    }
});
