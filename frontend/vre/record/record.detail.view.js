import _ from 'lodash';
import { CompositeView } from '../core/view.js';
import { vreChannel } from '../radio';
import { FlatAnnotations } from '../annotation/annotation.model';
import { RecordFieldsView } from '../field/record.fields.view';
import { RecordAnnotationsView } from '../field/record.annotations.view';
import { FlatterFields } from '../field/field.model';
import { AddToCollectionView } from '../collection/add-to-collection.view';
import { RemoveFromCollectionView } from '../collection/remove-from-collection.view.js';
import { typeTranslation } from '../utils/generic-functions.js';
import { GlobalVariables } from '../globals/variables';
import recordDetailTemplate from './record.detail.view.mustache';
import typeIconTemplate from './record.type.icon.mustache';

var renderOptions = {
    partials: {
        typeIcon: typeIconTemplate,
    }
};

export var RecordDetailView = CompositeView.extend({
    template: recordDetailTemplate,
    className: 'modal',
    attributes: {
        'role': 'dialog',
    },

    subviews: [{
        view: 'fieldsView',
        selector: '.modal-body'
    }, {
        view: 'annotationsView',
        selector: '.modal-body'
    }, {
        view: 'removeButton',
        selector: '.modal-footer',
        method: 'prepend',
    }, {
        view: 'addSelect',
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
            collection: new FlatterFields(null, {record: model}),
        }).render();
        this.annotationsView = new RecordAnnotationsView({
            collection: new FlatAnnotations(null, {record: model}),
        }).render();
        this.annotationsView.listenTo(this.fieldsView, 'edit', this.annotationsView.edit);
        this.addSelect = new AddToCollectionView({
            collection: GlobalVariables.myCollections,
        }).on('addRecords', this.submitToCollections, this);
        this.removeButton = new RemoveFromCollectionView({
            collection: GlobalVariables.myCollections,
        }).on('removeRecords', this.removeFromCollection, this);
        this.render();
    },

    renderContainer: function() {
        this.$el.html(this.template(_.assign({
            title: this.model.getMainDisplay(),
            uri: this.model.id,
            databaseId: this.model.get("edpoprec:identifier"),
            publicURL: this.model.get("edpoprec:publicURL"),
        }, typeTranslation(this.model)), renderOptions));
        return this;
    },

    remove: function() {
        this.$el.modal('hide');
        RecordDetailView.__super__.remove.call(this);
        return this.trigger('remove');
    },

    submitToCollections: function() {
        this.addSelect.submitForm([this.model.id]);
    },

    removeFromCollection: function() {
        this.removeButton.submitForm({
            records: [this.model.id],
            collection: vreChannel.request('browsingContext').get('uri'),
        }).then(this.handleRemoval.bind(this));
    },

    handleRemoval: function() {
        this.next();
        this.model.collection.remove(this.model);
    },

    display: function() {
        this.$el.modal('show');
        return this;
    },

    next: function(event) {
        event && event.preventDefault();
        vreChannel.trigger('displayNextRecord');
    },

    previous: function(event) {
        event.preventDefault();
        vreChannel.trigger('displayPreviousRecord');
    },
});
