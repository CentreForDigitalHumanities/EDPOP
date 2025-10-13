import _ from 'lodash';
import { AnnotationEditView } from '../annotation/annotation.edit.view';
import { vreChannel } from '../radio.js';
import {AggregateView} from "../core/view";

/**
 * Base view for displaying annotations, used for field annotations
 * (FieldView, together with the field itself) and record annotations
 * (RecordAnnotationsView). The view's collection should be the
 * set of annotations. Editing and deletion are implemented here;
 * adding new annotations can be implemented by calling edit() with
 * a new annotation model.
 */
export var AnnotatableView = AggregateView.extend({
    initialize: function(options) {
        this.initItems().render().initCollectionEvents();
        this.listenTo(this.collection, 'edit', this.edit);
    },

    edit: function(model) {
        var project = vreChannel.request('projects:current').get('name'),
            editTarget = model.clone().set('context', project),
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
        this.collection.underlying.add(model, {merge: true});
        model.save();
    },

    trash: function(editRow) {
        if (editRow.existing) {
            this.collection.underlying.remove(editRow.model);
        } else {
            this.cancel(editRow);
        }
    },
});
