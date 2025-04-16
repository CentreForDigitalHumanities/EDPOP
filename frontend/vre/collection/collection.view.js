import _ from 'lodash';

import { View } from '../core/view.js';
import { AlertView } from '../alert/alert.view';
import { AdditionsToCollections } from '../additions/additions-to-collections';
import { vreChannel } from '../radio.js';
import collectionTemplate from './collection.view.mustache';

/**
 * View to add a record to a specific collection.
 */
export var VRECollectionView = View.extend({
    tagName: 'form',
    template: collectionTemplate,
    events: {
        'submit': 'addRecords',
        'change select': 'activateButton',
    },
    initialize: function() {
        this.render();
    },
    render: function() {
        var shownCollections = vreChannel.request('unsalientcollections');
        this.$('select').select2('destroy');
        this.$el.html(this.template({
            models: shownCollections.toJSON(),
            cid: this.cid,
        }));
        this.$('select').select2();
        return this;
    },
    remove: function() {
        this.$('select').select2('destroy');
        return VRECollectionView.__super__.remove.call(this);
    },
    clear: function() {
        this.$el.val(null).trigger('change');
        return this;
    },
    activateButton: function(event) {
        event.preventDefault();
        if (this.$('select').val().length) {
            this.$('button').removeClass("disabled");
        }
        else {
            this.$('button').addClass("disabled");
        }
    },
    addRecords: function(event) {
        event.preventDefault();
        this.trigger('addRecords', this);
    },
    submitForm: function(selected_records) {
        if (!selected_records.length) return;
        var selected_collections = this.$('select').val();
        if (!selected_collections.length) return;
        var records_and_collections = new AdditionsToCollections({
            'records': selected_records,
            'collections': selected_collections,
        });
        records_and_collections.save().then(
            this.showSuccess.bind(this),
            this.showError.bind(this),
        );
    },
    reportAddition: function(amount, uri) {
        var name = this.collection.get(uri).get('name');
        return 'Added ' + amount + ' record(s) to ' + name + '.';
    },
    showSuccess: function(response) {
        var feedback = _.map(response, this.reportAddition.bind(this));
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
