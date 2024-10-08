import { CompositeView } from '../core/view.js';
import { vreChannel } from '../radio';
import { FlatAnnotations } from '../annotation/annotation.model';
import { RecordFieldsView } from '../field/record.fields.view';
import { RecordAnnotationsView } from '../field/record.annotations.view';
import { FlatFields } from '../field/field.model';
import { VRECollectionView } from '../collection/collection.view';
import { GlobalVariables } from '../globals/variables';
import recordDetailTemplate from './record.detail.view.mustache';

export var RecordDetailView = CompositeView.extend({
    template: recordDetailTemplate,
    className: 'modal',
    attributes: {
        'role': 'dialog',
    },

    subviews: [{
        view: 'fieldsView',
        selector: '.modal-body'
    },{
        view: 'annotationsView',
        selector: '.modal-body'
    },{
        view: 'vreCollectionsSelect',
        selector: '.modal-footer',
        method: 'prepend'
    }],

    events: {
        'click #load_next': 'next',
        'click #load_previous': 'previous',
    },

    initialize: function(options) {
        var model = this.model;
        this.fieldsView = new RecordFieldsView({
            collection: new FlatFields(null, {record: model}),
        }).render();
        this.annotationsView = new RecordAnnotationsView({
            collection: new FlatAnnotations(null, {record: model}),
        }).render();
        this.annotationsView.listenTo(this.fieldsView, 'edit', this.annotationsView.edit);
        this.vreCollectionsSelect = new VRECollectionView({
            collection: GlobalVariables.myCollections,
            model: model,
        });
        this.render();
    },

    renderContainer: function() {
        this.$el.html(this.template({
            title: this.model.getMainDisplay(),
            uri: this.model.id,
            databaseId: this.model.get("edpoprec:identifier"),
            publicURL: this.model.get("edpoprec:publicURL"),
        }));
        return this;
    },

    remove: function() {
        this.$el.modal('hide');
        RecordDetailView.__super__.remove.call(this);
        return this.trigger('remove');
    },

    display: function() {
        this.$el.modal('show');
        return this;
    },

    next: function(event) {
        event.preventDefault();
        vreChannel.trigger('displayNextRecord');
    },

    previous: function(event) {
        event.preventDefault();
        vreChannel.trigger('displayPreviousRecord');
    },
});
