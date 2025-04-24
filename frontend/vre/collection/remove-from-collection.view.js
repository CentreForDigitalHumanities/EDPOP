import _ from 'lodash';

import { vreChannel } from '../radio.js';
import { View } from '../core/view.js';
import { AlertView } from '../alert/alert.view';
import { RemovalsFromCollection } from '../collection/removals-from-collection';
import removalTemplate from './remove-from-collection.view.mustache';

/**
 * View to add a record to a specific collection.
 */
export var RemoveFromCollectionView = View.extend({
    tagName: 'form',
    template: removalTemplate,
    events: {
        'submit': 'removeRecords',
    },
    initialize: function() {
        this.render();
    },
    render: function() {
        if (vreChannel.request('browsingType') === 'collection') {
            this.$el.html(this.template());
        }
        return this;
    },
    removeRecords: function(event) {
        event.preventDefault();
        this.trigger('removeRecords', this);
    },
    submitForm: function(selection) {
        if (!selection.records.length) return;
        var records_and_collections = new RemovalsFromCollection(selection);
        records_and_collections.save().then(
            this.showSuccess.bind(this),
            this.showError.bind(this),
        );
    },
    reportRemoval: function(amount, uri) {
        var name = this.collection.get(uri).get('name');
        return 'Removed ' + amount + ' record(s) from ' + name + '.';
    },
    showSuccess: function(response) {
        var feedback = _.map(response, this.reportRemoval.bind(this));
        var feedbackString = feedback.join(' ');
        this.showAlert('success', feedbackString);
    },
    showError: function(response) {
        this.showAlert('warning', response.responseJSON.error);
    },
    showAlert: function(level, message) {
        var alert = new AlertView({level: level, message: message});
        alert.render().$el.prependTo(this.el);
        alert.animate('remove');
    },
});
