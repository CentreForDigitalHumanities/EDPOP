import { CompositeView } from '../core/view.js';

import { SearchResults } from '../search/search.model.js';
import { SearchView } from '../search/search.view.js';
import { RecordListManagingView } from '../record/record.list.managing.view.js';
import collectionSearchTemplate from './collection.search.view.mustache';

export var CatalogSearchView = CompositeView.extend({
    template: collectionSearchTemplate,
    subviews: [
        'searchView',
        'recordsManager',
    ],
    initialize: function() {
        this.collection = this.collection || new SearchResults;
        this.searchView = new SearchView({
            model: this.model,
            collection: this.collection,
        });
        this.recordsManager = new RecordListManagingView({
            collection: this.collection,
            type: "catalog",
        });
        this.render();
    },
    renderContainer: function() {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    },
});
