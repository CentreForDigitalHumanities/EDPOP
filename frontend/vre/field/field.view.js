import {AggregateView} from "../core/view";
import fieldTemplate from './field.view.mustache';
import {AnnotationEditView} from "../annotation/annotation.edit.view";
import {CommentView} from "../annotation/comment.view";
import _ from "lodash";
import {Annotation} from "../annotation/annotation.model";

/**
 * Displays a single model from a FlatFields or FlatAnnotations collection.
 */
export var FieldView = AggregateView.extend({
    tagName: 'tr',
    template: fieldTemplate,
    subview: CommentView,
    container: 'div.annotations',

    initialize: function(options) {
        this.initItems().render().initCollectionEvents();
        this.render().listenTo(this.model, 'change:value', this.renderContainer);
        this.listenTo(this.collection, 'edit', this.edit);
    },

    makeItem: function(model) {
        return new this.subview({model: model, fieldAnnotation: true});
    },

    events: {
        'click a.comment': 'addComment',
    },

    renderContainer: function() {
        const templateData = {
            field: this.model.get('key'),
        };
        // Check if model is of Field model before using these methods, because
        // there are some tests relating to old-style annotations that assign
        // custom models
        if (typeof this.model.getMainDisplay === 'function') {
            Object.assign(templateData, {
                displayText: this.model.getMainDisplay(),
                fieldInfo: this.model.getFieldInfo(),
            });
        }
        this.$el.html(this.template(templateData));
        return this;
    },

    edit: function(model) {
        var editTarget = model.clone(),
            preExisting = this.collection.get(editTarget),
            newRow;
        if (preExisting) {
            var index = this.collection.indexOf(preExisting),
                oldRow = this.items[index];
            newRow = new AnnotationEditView({
                model: preExisting,
                existing: true,
            });
            this.items.splice(index, 1, newRow);
            oldRow.remove();
        } else {
            newRow = new AnnotationEditView({model: editTarget});
            this.items.push(newRow);
        }
        this.placeItems();
        newRow.on(_.pick(this, ['save', 'cancel', 'trash']), this);
    },

    addComment: function(event) {
        event.preventDefault();
        console.log(this.model);
        var fieldId = this.model.get('key');
        var fieldContents = this.model.get('value');
        this.edit(new Annotation({
            "oa:hasTarget": this.collection.underlying.target,
            "edpopcol:selectField": fieldId,
            "edpopcol:selectOriginalText": (fieldContents ? fieldContents['edpoprec:originalText'] : null),
            "oa:motivatedBy": {"@id": "oa:commenting"},
        }));
    },

    cancel: function(editRow) {
        var index = _.indexOf(this.items, editRow);
        editRow.remove();
        this.items.splice(index, 1);
        if (editRow.existing) {
            this.items.splice(index, 0, this.makeItem(editRow.model));
            this.placeItems();
        }
    },

    save: function(editRow) {
        var model = editRow.model;
        this.cancel(editRow);
        this.collection.add(model, {merge: true});
        model.save();
    },

    trash: function(editRow) {
        if (editRow.existing) {
            this.collection.remove(editRow.model);
        } else {
            this.cancel(editRow);
        }
    },
});
