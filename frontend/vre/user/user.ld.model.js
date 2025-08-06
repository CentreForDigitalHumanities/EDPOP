import {JsonLdModel} from "../utils/jsonld.model";

/**
 * Model to represent the LD version of a user. This model stands next to
 * User, which works with a REST API and which is used to get the
 * information about the currently logged-in user, but they may be
 * merged in the future.
 */
export var UserLd = JsonLdModel.extend({
    getUsername: function() {
        // Extract username from URI
        if (!this.id) return null;
        return this.id.split('/').pop();
    }
});
