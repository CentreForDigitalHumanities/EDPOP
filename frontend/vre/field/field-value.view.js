import _ from 'lodash';
import { $ } from 'backbone';

import { View } from '../core/view.js';
import fieldValueTemplate from './field-value.view.mustache';
import fieldRelinkTemplate from './field.relink.options.mustache';

function bubble(eventName) {
    return function(event) {
        event.preventDefault();
        this.model.trigger(eventName, this.model, this);
    };
}

export var FieldValueView = View.extend({
    tagName: 'tr',
    template: fieldValueTemplate,

    events: {
        'click .fa-plus, .fa-pen': bubble('edit'),
        'click .fa-xmark': bubble('discard'),
        'click': 'mockDanglingEdit',
    },

    initialize: function(options) {
        this.relinkOptions = options.relinkOptions;
        this.render()
            .listenTo(this.model, 'change', this.render)
            .listenTo(this.relinkOptions, 'update', this.renderRelinkOptions);
        this.$el.popover({
            trigger: 'focus',
            container: 'body',
            content: fieldRelinkTemplate(this),
            html: true,
            sanitize: false,
            placement: 'bottom',
            selector: 'a.fa-link-slash',
            title: 'Relink edit to which original value?',
        });
        this.relinkPicker = $('body').on(
            'click',
            '#relink-' + this.cid + ' .relink-option',
            this.pickRelinkOption.bind(this),
        );
    },

    render: function() {
        var attributes = this.model.attributes,
            original = attributes.original,
            recordField = this.model.collection.recordField,
            fieldInfo = attributes.isFirst && recordField.fieldInfo(),
            linkedUri = original && original.getLinkedUri(),
            linkedRecordUri = linkedUri && encodeURIComponent(linkedUri),
            edit = attributes.edit,
            updatedDate = edit && edit.getUpdatedDate(),
            originalText = attributes.originalText,
            payload = _.extend({}, attributes, {
                fieldInfo,
                linkedRecordUri,
                updatedDate,
            });
        if (edit && originalText && originalText.length > 20) {
            payload.shortOriginalText = (
                originalText.slice(0, 9) + '…' + originalText.slice(-9)
            );
        }
        this.$el.html(this.template(payload));
        return this;
    },

    renderRelinkOptions: function() {
        this.$el.popover('setContent', {
            '.popover-body': fieldRelinkTemplate(this),
        });
    },

    remove: function() {
        this.$el.popover('dispose');
        this.relinkPicker.off();
        FieldValueView.__super__.remove.call(this);
    },

    pickRelinkOption: function(event) {
        var edit = this.model.get('edit');
        if (!edit) return;
        edit.set('edpopcol:originalText', event.target.textContent);
        edit.save();
    },

    mockDanglingEdit: function(event) {
        if (!event.shiftKey) return;
        var edit = this.model.get('edit');
        if (!edit || !edit.has('edpopcol:originalText')) return;
        edit.set('edpopcol:originalText', 'simulated dangle');
    },
});
