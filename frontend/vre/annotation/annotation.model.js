import _ from 'lodash';
import { parent } from '@uu-cdh/backbone-collection-transformers/src/inheritance.js';

import {getDateTimeLiteral, JsonLdModel, JsonLdNestedCollection} from "../utils/jsonld.model";
import {UserLd} from "../user/user.ld.model";
import {glossary} from "../utils/glossary";

// Helper function for removing multiple properties from an object in iteration.
function stripAttribute(container) {
    return function(name) {
        delete container[name];
    };
}

export var Annotation = JsonLdModel.extend({
    urlRoot: '/api/annotation/',
    getBody: function() {
        return this.get('oa:hasBody');
    },
    getDisplayText: function() {
        if (this.get('motivation') === 'oa:commenting') {
            return this.getBody();
        } else if (this.get('motivation') === 'oa:tagging') {
            var id = this.get('tagURL');
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
    // Fields that are normally nested in JSON-LD, but get hoisted to the
    // top-level `attributes` for more convenient access. See the overridden
    // `parse` and `toJSON` methods below.
    flatFields: ['motivation', 'tagURL', 'oa:hasSource', 'edpopcol:field', 'edpopcol:originalText'],
    parse: function(response, options) {
        var anno = parent(Annotation.prototype)
            .parse.call(this, response, options),
            flat = {},
            motivation = anno['oa:motivatedBy'],
            body = anno['oa:hasBody'],
            target = anno['oa:hasTarget'];
        if (motivation) flat.motivation = motivation['@id'];
        if (body && body['@id']) flat.tagURL = body['@id'];
        if (target) {
            var source = target['oa:hasSource'],
                selector = target['oa:hasSelector'];
            if (source) flat['oa:hasSource'] = source['@id'];
            if (selector) {
                var field = selector['edpopcol:field'],
                    text = selector['edpopcol:originalText'];
                if (field) flat['edpopcol:field'] = field['@id'];
                if (text) flat['edpopcol:originalText'] = text;
            }
        }
        return _.assign(flat, anno);
    },
    toJSON: function(options) {
        var jsonld = parent(Annotation.prototype).
            toJSON.call(this, options),
            flatMotivation = jsonld.motivation,
            flatTagURL = jsonld.tagURL,
            target = jsonld['oa:hasTarget'] || {},
            selector = target['oa:hasSelector'] || {},
            flatSource = jsonld['oa:hasSource'],
            flatField = jsonld['edpopcol:field'],
            flatText = jsonld['edpopcol:originalText'];
        if (flatField) selector['edpopcol:field'] = {'@id': flatField};
        if (flatText) selector['edpopcol:originalText'] = flatText;
        if (flatField || flatText) var flatSelector = true;
        if (flatSource) target['oa:hasSource'] = {'@id': flatSource};
        if (flatSelector) target['oa:hasSelector'] = selector;
        if (flatSource || flatSelector) jsonld['oa:hasTarget'] = target;
        if (flatTagURL) jsonld['oa:hasBody'] = {'@id': flatTagURL};
        if (flatMotivation) jsonld['oa:motivatedBy'] = {'@id': flatMotivation};
        _.each(this.flatFields, stripAttribute(jsonld));
        return jsonld;
    },
});

export var Annotations = JsonLdNestedCollection.extend({
    model: Annotation,
    initialize: function(model, options) {
        _.assign(this, _.pick(options, ['target']));
        this.url = `/api/record-annotations/${encodeURIComponent(this.target)}/`;
        this.on('remove', this.deleteAnnotation);
    },
    deleteAnnotation: function(annotation) {
        annotation.destroy();
    }
})
