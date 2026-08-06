import _ from 'lodash';
import { View } from '../core/view.js';
import fieldValueTemplate from './field-value.view.mustache';

function bubble(eventName) {
    return function(event) {
        event.preventDefault();
        this.model.trigger(eventName, this.model, this, event);
    };
}

export var FieldValueView = View.extend({
    tagName: 'tr',
    template: fieldValueTemplate,

    events: {
        'click .fa-plus, .fa-pen': bubble('edit'),
        'click .fa-link-slash': bubble('requestRelink'),
        'click .fa-xmark': bubble('discard'),
        'click': 'mockDanglingEdit',
    },

    initialize: function() {
        this.render().listenTo(this.model, 'change', this.render);
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

    mockDanglingEdit: function(event) {
        if (!event.shiftKey) return;
        var edit = this.model.get('edit');
        if (!edit || !edit.has('edpopcol:originalText')) return;
        edit.set('edpopcol:originalText', 'simulated dangle');
    },
});
