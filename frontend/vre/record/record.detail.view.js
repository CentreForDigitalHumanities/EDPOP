import _ from 'lodash';
import { FilteredCollection } from "../utils/filtered.collection";
import { CompositeView } from '../core/view.js';
import { vreChannel } from '../radio';
import { RecordFieldsView } from '../field/record.fields.view';
import { RecordAnnotationsView } from '../field/record.annotations.view';
import { Field, FlatterFields } from '../field/field.model';
import { AddToCollectionView } from '../collection/add-to-collection.view';
import { RemoveFromCollectionView } from '../collection/remove-from-collection.view.js';
import { typeTranslation } from '../utils/generic-functions.js';
import recordDetailTemplate from './record.detail.view.mustache';
import typeIconTemplate from './record.type.icon.mustache';
import {DigitizationsView} from "../digitization/digitizations.view";
import {RecordAboutView} from "./record.about.view";

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
        'data-bs-focus': 'false',
        'data-bs-keyboard': 'true',
        'tabindex': '-1',
    },

    subviews: [{
        view: 'fieldsView',
        selector: '#main-content'
    }, {
        view: 'removeButton',
        selector: '.modal-footer',
        method: 'prepend',
    }, {
        view: 'addSelect',
        selector: '.modal-footer'
    }, {
        view: 'aboutView',
        selector: '#side-content',
    }, {
        view: 'digitizationsView',
        selector: '#side-content',
    }, {
        view: 'annotationsView',
        selector: '#side-content'
    }],

    events: {
        'click #load_next': 'next',
        'click #load_previous': 'previous',
        'click #reload': 'reload',
        'hidden.bs.modal': 'triggerRemove',
    },

    initialize: function(options) {
        var model = this.model;
        model.getAnnotations();
        if (model.collection) {
            this.previousRecord = vreChannel.request('getPreviousRecord', this.model);
            this.nextRecord = vreChannel.request('getNextRecord', this.model);
        }
        var fields = new FlatterFields(null, {record: model});
        var digitizations = new FilteredCollection(fields, {
            key: 'edpoprec:digitization'
        });
        this.fieldsView = new RecordFieldsView({
            collection: fields,
        }).render();
        this.digitizationsView = new DigitizationsView({
            collection: digitizations,
        });
        this.aboutView = new RecordAboutView({
            model: model,
        });
        var recordAnnotations = FilteredCollection(model.annotations, (annotation) => {
            return !annotation.get('edpopcol:field');
        });
        this.annotationsView = new RecordAnnotationsView({
            collection: recordAnnotations,
        }).render();
        this.annotationsView.listenTo(this.fieldsView, 'edit', this.annotationsView.edit);
        var myCollections = vreChannel.request('allcollections');
        this.addSelect = new AddToCollectionView({
            collection: myCollections,
        }).on('addRecords', this.submitToCollections, this);
        this.removeButton = new RemoveFromCollectionView({
            collection: myCollections,
        }).on('removeRecords', this.removeFromCollection, this);
        this.render();
    },

    renderContainer: function() {
        this.$el.html(this.template(_.assign({
            first: !this.previousRecord,
            last: !this.nextRecord,
            title: this.model.getMainDisplay(),
            uri: this.model.id,
            inContext: this.model.collection ? true : false,
        }, typeTranslation(this.model)), renderOptions));
        return this;
    },

    remove: function() {
        this.$el.modal('hide');
        RecordDetailView.__super__.remove.call(this);
        return this.trigger('remove');
    },

    triggerRemove: function() {
        return this.trigger('remove');
    },

    submitToCollections: function() {
        this.addSelect.submitForm([this.model]);
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
        this.$el.focus();
        return this;
    },

    next: function(event) {
        event && event.preventDefault();
        if (this.nextRecord) vreChannel.trigger('displayRecord', this.nextRecord);
    },

    previous: function(event) {
        event.preventDefault();
        if (this.previousRecord) vreChannel.trigger('displayRecord', this.previousRecord);
    },

    reload: function(event) {
        event.preventDefault();
        this.model.reload();
    }
});
