import { View } from '../core/view.js';
import { AlertView } from '../alert/alert.view';
import { AdditionsToCollections } from '../additions/additions-to-collections';
import { vreChannel } from '../radio.js';
import collectionTemplate from './collection.view.mustache';

/**
 * View to add a record to a specific collection.
 */
export var VRECollectionView = View.extend({
    template: collectionTemplate,
    events: {
        'click button': 'submitForm',
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
    setRecord: function(model) {
        this.model = model;
        return this;
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
    submitForm: function(event, selected_records) {
        event.preventDefault();
        selected_records = selected_records || [];
        if (this.model) {
            // adding to array as the api expects an array.
            selected_records.push(this.model.toJSON());
        }
        var selected_collections = this.$('select').val();
        var records_and_collections = new AdditionsToCollections({
            'records': selected_records,
            'collections': selected_collections,
        });
        records_and_collections.save().then(
            this.showSuccess.bind(this),
            this.showError.bind(this),
        );
    },
    showSuccess: function(response) {
        var feedbackString = '';
        $.each(response, function(key, value) {
            feedbackString = feedbackString.concat('Added ', value, ' record(s) to ', key, ". ");
        });
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
