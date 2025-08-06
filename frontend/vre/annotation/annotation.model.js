import {getDateLiteral, JsonLdModel, JsonLdNestedCollection} from "../utils/jsonld.model";
import {UserLd} from "../user/user.ld.model";

export var Annotation = JsonLdModel.extend({
    getBody: function() {
        return this.get('oa:hasBody');
    },
    getDate: function() {
        return getDateLiteral(this.get('as:published'));
    },
    getAuthor: function() {
        return new UserLd(this.get('dcterms:creator'));
    },
    saveNew: function(target) {
        this.save({
            "oa:hasTarget": target,
        }, {
            url: `/api/annotations/add/`,
        });
    },
    deleteFromDatabase: function() {
        this.save(null, {
            url: `/api/annotations/delete/`,
        })
    }
});

export var Annotations = JsonLdNestedCollection.extend({
    model: Annotation,
    initialize: function(model, options) {
        _.assign(this, _.pick(options, ['target']));
        this.url = `/api/annotations/get/${encodeURIComponent(this.target)}/`;
        this.on('add change:value', this.updateAnnotation);
        this.on('remove', this.deleteAnnotation);
    },
    updateAnnotation: function(annotation) {
        if (annotation.isNew()) {
            annotation.saveNew(this.target);
        }
    },
    deleteAnnotation: function(annotation) {
        annotation.deleteFromDatabase();
    }
})
