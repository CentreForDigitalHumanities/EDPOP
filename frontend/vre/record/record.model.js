import _ from 'lodash';

import { Annotations } from '../annotation/annotation.model';
import { JsonLdModel, JsonLdNestedCollection} from "../utils/jsonld.model";
import { FlatFields } from "../field/field.model";
import {vreChannel} from "../radio";

/**
 * Get the URL to fetch the record on its own from the backend.
 * @param {string} record_uri
 * @returns {string}
 */
function get_fetch_url(record_uri) {
    return record_uri.replace('https://edpop.hum.uu.nl/', '/');
}

function getRecordTags(annotations) {
    if (!annotations) return undefined;
    return annotations.chain()
    .filter((anno) => !anno.get('edpopcol:field') && anno.get('motivation') === 'oa:tagging')
    // TODO: replace by _.invoke when switching to Underscore
    .invokeMap('getDisplayText')
    .join(', ')
    .value();
}

function displayText(fieldValue) {
    return fieldValue.get('correctedText') || fieldValue.get('originalText')
}

var recordType2displayField = {
    'edpoprec:BibliographicalRecord': 'edpoprec:title',
    'edpoprec:BiographicalRecord': 'edpoprec:name',
};

export var Record = JsonLdModel.extend({
    urlRoot: '/api/records',
    /**
     * Get the main display field, usually title or name
     * @param {RecordFields} contents - computed presentable contents of this record
     * @return {RecordField|undefined}
     */
    mainDisplayField: function(contents) {
        /* For now, just support edpoprec:BibliographicalRecord and
           edpoprec:BiographicalRecord with hardcoded solutions */
        var type = this.get("@type");
        var fieldName = recordType2displayField[type];
        if (fieldName) return contents.get(fieldName);
    },
    /**
     * Get the contents of the main display field
     * @param {RecordField} [field] - computed main display field of this record
     * @return {string}
     */
    getMainDisplay: function(field) {
        if (typeof field === "undefined") return `<${this.id}>`;
        return _.chain(field.content.map(displayText))
            .filter(_.isString).sortBy('length').first().value();
    },
    toTabularData: function() {
        const fields = new FlatFields(undefined, {record: this});
        const data = {
            model: this,
            type: this.get('@type'),
            fromCatalog: this.getCatalogName(),
            hasAnnotations: this.annotations && !!this.annotations.length,
            tags: getRecordTags(this.annotations),
            id: this.id,  // id is used for identification by Tabular by default
        };
        fields.forEach((field) => {
            data[field.id] = field.getMainDisplay(this.annotations);
        });
        return data;
    },
    getAnnotations: function() {
        if (!this.annotations) {
            this.annotations = new Annotations(null, {target: this.id});
            if (!this.isNew()) {
                this.annotations.fetch();
            }
            /* Trigger annotations:loaded to rerender the table row with annotations
               on sync (which happens after fetching, creating and editing an annotation
               and remove (which happens after deleting an annotation) */
            this.annotations.on('sync remove', () => this.trigger('annotations:loaded', this));
        }
        return this.annotations;
    },
    getCatalogName: function() {
        const catalog = this.get('edpoprec:fromCatalog');
        const catalogUri = catalog && catalog['@id'];
        return vreChannel.request('getCatalog', catalogUri).getName();
    },
    url: function() {
        if (this.id)
            return get_fetch_url(this.id);
        else
            return this.urlRoot;
    },
    reload: function() {
        /* Fetch the record with 'Force-Reload' to make sure that the
           backend reloads the record from the original catalogue.
         */
        this.fetch({
            headers: {
                'Force-Reload': 'true'
            }
        });
    },
});

export var Records = JsonLdNestedCollection.extend({
    model: Record,
    toTabularData: function() {
        return _.invokeMap(this.models, 'toTabularData');
    },
});
