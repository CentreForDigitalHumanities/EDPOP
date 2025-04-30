import { CompositeView } from '../core/view.js';

import { SearchResults } from '../search/search.model.js';
import { SearchView } from '../search/search.view.js';
import { RecordListManagingView } from '../record/record.list.managing.view.js';
import { OverlayView } from '../utils/overlay.view.js';
import { EditSummaryView } from './edit-summary.view.js';
import collectionTemplate from './browse-collection.view.mustache';

export var BrowseCollectionView = CompositeView.extend({
    template: collectionTemplate,

    events: {
        'click .page-header small button': 'editSummary',
    },

    subviews: [
        {view: 'searchView', selector: '.page-header'},
        'recordsManager',
        {view: 'editOverlay', place: false},
    ],

    initialize: function() {
        this.collection = this.collection || this.model.getRecords();
        this.searchView = new SearchView({
            model: this.model,
            collection: this.collection,
        });
        this.recordsManager = new RecordListManagingView({
            model: this.model,
            collection: this.collection,
        });
        var editor = new EditSummaryView({model: this.model});
        var overlay = this.editOverlay = new OverlayView({
            root: this.el,
            target: '.page-header h2 small',
            guest: editor,
        });
        overlay.listenTo(editor, 'submit reset', overlay.uncover);
        this.render().listenTo(this.model, 'change', this.render);
    },

    renderContainer: function() {
        this.$el.html(this.template(this.model.attributes));
        return this;
    },

    editSummary: function() {
        this.editOverlay.cover();
        return this;
    },
});
