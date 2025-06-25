import { APIModel } from '../utils/api.model'
import {JsonLdCollection, JsonLdModel} from "../utils/jsonld.model";

/**
 * Representation of a single catalogue.
 */
export var Catalog = JsonLdModel.extend({
    getName: function() {
        return this.get("name");
    }
});

/**
 * Representation of all available catalogs
 */
export var Catalogs = JsonLdCollection.extend({
    url: '/api/catalogs/catalogs/',
    model: Catalog,
});
