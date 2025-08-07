import {getDateLiteral, JsonLdModel, JsonLdNestedCollection} from "../utils/jsonld.model";
import {UserLd} from "../user/user.ld.model";

export var Annotation = JsonLdModel.extend({
    urlRoot: '/api/annotation/',
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
    url: function() {
        if (this.isNew()) {
            return '/api/annotation/';
        } else {
            return '/api/annotation/' + encodeURIComponent(this.id) + '/';
        }
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
        this.on('remove', this.deleteAnnotation);
    },
    deleteAnnotation: function(annotation) {
        annotation.destroy();
    }
})
