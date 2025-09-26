import {
    getDateTimeLiteral,
    JsonLdModel,
    JsonLdNestedCollection,
    jsonLdSync,
    priorMethod,
} from "../utils/jsonld.model";
import {UserLd} from "../user/user.ld.model";
import {glossary} from "../utils/glossary";

export var Annotation = JsonLdModel.extend({
    urlRoot: '/api/annotation/',
    // TODO: remove the next line after adapting the backend so that it can
    // process JSON-LD as such.
    sync: priorMethod(JsonLdModel.prototype, 'sync', jsonLdSync),
    getBody: function() {
        return this.get('oa:hasBody');
    },
    getDisplayText: function() {
        if (this.getAnnotationType() === 'comment') {
            return this.getBody();
        } else if (this.getAnnotationType() === 'tag') {
            var id = this.getBody();
            return glossary.get(id).get('skos:prefLabel');
        }
    },
    getPublishedDate: function() {
        return getDateTimeLiteral(this.get('as:published'));
    },
    getUpdatedDate: function() {
        return getDateTimeLiteral(this.get('as:updated'));
    },
    getAuthor: function() {
        return new UserLd(this.get('dcterms:creator'));
    },
    getAnnotationType: function() {
        var motivation = this.get('oa:motivatedBy');
        if (!motivation) return null;
        var motivationId = motivation["@id"];
        if (motivationId === 'oa:commenting') {
            return 'comment';
        } else if (motivationId === 'oa:tagging') {
            return 'tag';
        } else {
            console.warn('Unsupported annotation type: ' + motivationId);
            return null;
        }
    },
    url: function() {
        if (this.isNew()) {
            return '/api/annotation/';
        } else {
            return '/api/annotation/' + encodeURIComponent(this.id) + '/';
        }
    },
});

export var Annotations = JsonLdNestedCollection.extend({
    model: Annotation,
    // TODO: remove the next line after adapting the backend so that it can
    // process JSON-LD as such.
    sync: priorMethod(JsonLdModel.prototype, 'sync', jsonLdSync),
    initialize: function(model, options) {
        _.assign(this, _.pick(options, ['target']));
        this.url = `/api/record-annotations/${encodeURIComponent(this.target)}/`;
        this.on('remove', this.deleteAnnotation);
    },
    deleteAnnotation: function(annotation) {
        annotation.destroy();
    }
})
