import {JsonLdModel} from "../utils/jsonld.model";

export var IIIFManifestModel = JsonLdModel.extend({
    thumbnailUrl: function() {
        return this.get("thumbnail")?.["@id"];
    },
});
