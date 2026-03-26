import { CompositeView } from '../core/view.js';
import { AddToCollectionView } from '../collection/add-to-collection.view';
import { RemoveFromCollectionView } from '../collection/remove-from-collection.view.js';
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
        {view: 'removeButton', method: 'prepend'},
        {view: 'vreCollectionsSelect', method: 'prepend'},
        'recordListView',
    ],

    events: {
        'click .more-records': 'loadMore',
        'click .many-more-records': 'loadManyMore',
        'click .download-xlsx': 'downloadXLSX',
        'click .download-csv': 'downloadCSV',
        'click .create-blank': 'createBlank',
    },

    initialize: function(options) {
        _.assign(this, _.pick(options, ['recordClass']));
        this.type = vreChannel.request('browsingType');
        this.vreCollectionsSelect = new AddToCollectionView()
            .render().on('addRecords', this.submitToCollections, this);
        this.removeButton = new RemoveFromCollectionView({
            collection: vreChannel.request('allcollections'),
        }).on('removeRecords', this.removeFromCollection, this);
        this.recordListView = new RecordListView({
            collection: this.collection,
            recordClass: this.recordClass,
            type: this.type,
        });
        this.render();
    },

    renderContainer: function() {
        // If it weren't for wontache#84, we could just pass `this` to the
        // template and use the isCollection method directly from the template.
        // TODO: remove this workaround when wontache#84 is fixed.
        const isCollection = this.isCollection();
        const requestMoreMaximum = this.requestMoreMaximum();
        this.$el.html(this.template({isCollection, requestMoreMaximum}));
        return this;
    },

    isCollection: function() {
        return this.type === 'collection';
    },

    requestMoreMaximum: function() {
        var maximumForCatalogue = this.model.get('maximumRecordsPerPage');
        var maximum = 500;
        if (maximumForCatalogue && maximumForCatalogue < maximum) {
            return maximumForCatalogue;
        } else {
            return maximum;
        }
    },

    submitToCollections: function() {
        var selection = this.recordListView.currentSelection();
        this.vreCollectionsSelect.submitForm(selection);
    },

    removeFromCollection: function() {
        var selection = this.recordListView.currentSelection();
        this.removeButton.submitForm({
            records: _.map(selection, 'id'),
            collection: this.model.get('uri'),
        }).then(this.purgeRemoved.bind(this, selection));
    },

    purgeRemoved: function(records) {
        this.collection.remove(records);
    },

    loadMore: function(event) {
        this.collection.trigger('moreRequested', event, 50);
    },

    loadManyMore: function(event) {
        this.collection.trigger('moreRequested', event, this.requestMoreMaximum());
    },

    downloadXLSX: function() {
        this.recordListView.downloadXLSX();
    },

    downloadCSV: function() {
        this.recordListView.downloadCSV();
    },

    createBlank: function(event) {
        event.preventDefault();
        this.collection.trigger('createBlankRecord');
    },
});
