import {getDateLiteral, JsonLdModel, JsonLdNestedCollection} from "../utils/jsonld.model";
import {UserLd} from "../user/user.ld.model";

export var Annotation = JsonLdModel.extend({
    getBody: function() {
        return this.get('oa:hasBody');
    },
    getPublishedDate: function() {
        return getDateLiteral(this.get('as:published'));
    },
    getUpdatedDate: function() {
        return getDateLiteral(this.get('as:updated'));
    },
    getAuthor: function() {
        return new UserLd(this.get('dcterms:creator'));
    },
    saveNew: function(target) {
        this.save({
            "oa:hasTarget": target,
        }, {
            url: '/api/annotation/',
        });
    },
    saveExisting: function() {
        this.save(null, {
            url: '/api/annotation/' + encodeURIComponent(this.id) + '/',
        });
    },
    destroy: function() {
        this.save(null, {
            url: '/api/annotation/' + encodeURIComponent(this.id) + '/',
            method: 'DELETE',
        })
    }
});

export var Annotations = JsonLdNestedCollection.extend({
    model: Annotation,
    initialize: function(model, options) {
        _.assign(this, _.pick(options, ['target']));
        this.url = `/api/annotations-per-target/${encodeURIComponent(this.target)}/`;
        this.on('add', this.addAnnotation);
        this.on('change', this.updateAnnotation);
        this.on('remove', this.deleteAnnotation);
    },
    addAnnotation: function(annotation) {
        if (annotation.isNew()) {
            annotation.saveNew(this.target);
        }
    },
    updateAnnotation: function(annotation) {
        annotation.saveExisting();
    },
    deleteAnnotation: function(annotation) {
        annotation.destroy();
    }
})
