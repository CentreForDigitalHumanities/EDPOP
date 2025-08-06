import { JsonLdModel, JsonLdNestedCollection } from "../utils/jsonld.model";

export var Annotation = JsonLdModel.extend({
    getBody: function() {
        return this.get('oa:hasBody');
    },
    saveNew: function(target) {
        this.save({
            "oa:hasTarget": target,
        }, {
            url: `/api/annotations/add/`,
        })
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
