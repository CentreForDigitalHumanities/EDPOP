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
            payload = _.extend({}, attributes, {
                fieldInfo,
                linkedRecordUri,
                updatedDate,
            });
        this.$el.html(this.template(payload));
        return this;
    },
});
