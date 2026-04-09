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

export var Record = JsonLdModel.extend({
    urlRoot: '/api/records',
    /**
     * Get the contents of the main display field, usually title or name
     * @return {string}
     */
    getMainDisplay: function() {
        /* For now, just support edpoprec:BibliographicalRecord and
           edpoprec:BiographicalRecord with hardcoded solutions */
        let field;
        if (this.get("@type") === "edpoprec:BibliographicalRecord") {
            field = this.get("edpoprec:title");
        } else if (this.get("@type") === "edpoprec:BiographicalRecord") {
            field = this.get("edpoprec:name");
        }
        if (typeof field !== "undefined") {
            return field["edpoprec:originalText"];
        } else {
            // Cannot determine which field has the main text; return subject URI instead
            return `<${this.id}>`;
        }
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
            this.annotations.on('sync', () => this.trigger('annotations:loaded', this));
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
