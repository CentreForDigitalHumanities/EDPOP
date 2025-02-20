import { CompositeView } from '../core/view.js';
import { VRECollectionView } from '../collection/collection.view';
import { GlobalVariables } from '../globals/variables';
import recordListManagingTemplate from './record.list.managing.view.mustache';
import {RecordListView} from "./record.list.view";
import {vreChannel} from "../radio";
import {Record} from "./record.model";
import _ from "lodash";

export var RecordListManagingView = CompositeView.extend({
    tagName: 'form',
    template: recordListManagingTemplate,
    /**
     * The kind of record list ("collection" or "catalog")
     * @type {?string}
     */
    type: null,
    /**
     * The record class (BIBLIOGRAPHICAL or BIOGRAPHICAL)
     * @type {?string}
     */
    recordClass: null,

    subviews: [
        {view: 'vreCollectionsSelect', method: 'prepend'},
        'recordListView',
    ],

    events: {
        'submit': function(event) {
            event.preventDefault();
            var selection = this.recordListView.currentSelection();
            this.vreCollectionsSelect.submitForm(event, selection);
        },
        'click .more-records': 'loadMore',
        'click .500-more-records': 'load500More',
        'click .download-xlsx': 'downloadXLSX',
        'click .download-csv': 'downloadCSV',
        'click .create-blank': 'createBlank',
    },

    initialize: function(options) {
        _.assign(this, _.pick(options, ['type', 'recordClass']));
        this.vreCollectionsSelect = new VRECollectionView({
            collection: GlobalVariables.myCollections
        }).render();
        this.recordListView = new RecordListView({
            collection: this.collection,
            recordClass: this.recordClass
        });
        this.render();
        this.recordListView.render();
    },

    renderContainer: function() {
        const addBlankRecord = this.type === "collection";
        this.$el.html(this.template({addBlankRecord}));
        return this;
    },

    loadMore: function(event) {
        this.collection.trigger('moreRequested', event, 50);
    },

    load500More: function(event) {
        this.collection.trigger('moreRequested', event, 500);
    },

    downloadXLSX: function() {
        this.recordListView.downloadXLSX();
    },

    downloadCSV: function() {
        this.recordListView.downloadCSV();
    },

    createBlank: function() {
        vreChannel.trigger('displayRecord', new Record({
            content: {},
        }));
    },
});
