import { CompositeView } from '../core/view.js';

import { AlertView } from '../alert/alert.view';
import searchViewTemplate from './search.view.mustache';
import failedSearchTemplate from './failed.search.message.mustache';

export var SearchView = CompositeView.extend({
    template: searchViewTemplate,
    events: {
        'submit': 'firstSearch',
    },
    subviews: [{
        view: 'alert',
        method: 'prepend',
    }],
    initialize: function() {
        this.render().listenTo(this.collection, {
            moreRequested: this.nextSearch,
        });
    },
    renderContainer: function() {
        this.$el.html(this.template());
        return this;
    },
    showPending: function() {
        this.$('form button').first().text('Searching...');
        $("body").css("cursor", "progress");
        return this;
    },
    showIdle: function() {
        this.$('form button').first().text('Search');
        $("body").css("cursor", "default");
        return this;
    },
    submitSearch: function(startRecord, number=50) {
        this.showPending();
        var searchTerm = this.$('input').val();
        var searchPromise = this.collection.query({
            params: {
                source: this.model.id,
                query: searchTerm,
                start: startRecord,
                end: startRecord + number, // Backend correctly handles overflows here
            },
            error: _.bind(this.alertError, this),
            remove: startRecord === 0, // Remove current records if search starts at zero
        });
        searchPromise.always(this.showIdle.bind(this));
        return searchPromise;
    },
    alertError: function(collection, response, options) {
        const statusCode = response.status;
        const statusText = response.statusText;
        const message = response.responseJSON["http://www.w3.org/2011/http#reasonPhrase"];
        this.alert = new AlertView({
            level: 'warning',
            message: failedSearchTemplate({
                statusCode,
                statusText,
                message,
            }),
        });
        this.alert.once('removed', this.deleteAlert, this);
        this.placeSubviews();
        this.alert.animateIn();
    },
    deleteAlert: function() { delete this.alert; },
    firstSearch: function(event){
        event.preventDefault();
        // Start with record 0, which is what the EDPOP VRE API expects
        this.submitSearch(0).then(_.bind(function() {
            $('#more-records').show();
            this.feedback();
        }, this));
    },
    nextSearch: function(event, number) {
        event.preventDefault();
        $('#more-records').hide();
        var startRecord = this.collection.length;
        this.submitSearch(startRecord, number).then(this.feedback.bind(this));
    },
    feedback: function() {
        if (this.collection.length >= this.collection.totalResults) {
            this.collection.trigger('complete');
        } else {
            $('#more-records').show();
        }
        if (this.collection.length > 0) {
            $('#search-feedback').text("Showing " + this.collection.length + " of " + this.collection.totalResults + " results");
        } else {
            $('#search-feedback').text("No results found");
        }
    },
    fill: function(fillText) {
        this.$('#query-input').val(fillText);
    },
});
