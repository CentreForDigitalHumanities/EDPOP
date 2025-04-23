import { CompositeView } from '../core/view.js';
import { AddToCollectionView } from '../collection/add-to-collection.view';
import { RemoveFromCollectionView } from '../collection/remove-from-collection.view.js';
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
        {view: 'removeButton', method: 'prepend', place: 'isCollection'},
        {view: 'vreCollectionsSelect', method: 'prepend'},
        'recordListView',
    ],

    events: {
        'click .more-records': 'loadMore',
        'click .500-more-records': 'load500More',
        'click .download-xlsx': 'downloadXLSX',
        'click .download-csv': 'downloadCSV',
        'click .create-blank': 'createBlank',
    },

    initialize: function(options) {
        _.assign(this, _.pick(options, ['type', 'recordClass']));
        this.vreCollectionsSelect = new AddToCollectionView({
            collection: GlobalVariables.myCollections
        }).render().on('addRecords', this.submitToCollections, this);
        if (this.isCollection()) {
            this.removeButton = new RemoveFromCollectionView({
                collection: GlobalVariables.myCollections,
            }).on('removeRecords', this.removeFromCollection, this);
        }
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

    isCollection: function() {
        return this.type === 'collection';
    },

    submitToCollections: function() {
        var selection = this.recordListView.currentSelection();
        this.vreCollectionsSelect.submitForm(selection);
    },

    removeFromCollection: function() {
        var selection = this.recordListView.currentSelection();
        this.removeButton.submitForm({
            records: selection,
            collection: this.model.get('uri'),
        });
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
