import _ from 'lodash';
import Backbone from 'backbone';
import { AnnotationEditView } from '../annotation/annotation.edit.view';
import { vreChannel } from '../radio.js';
import {AggregateView} from "../core/view";
import recordAnnotationsTemplate from "./record.annotations.view.mustache";
import {CommentView} from "../annotation/comment.view";
import {Annotation} from "../annotation/annotation.model";

export var RecordAnnotationsView = AggregateView.extend({
    template: recordAnnotationsTemplate,
    container: 'tbody',
    subview: CommentView,

    renderContainer: function() {
        this.$el.html(this.template(this));
        return this;
    },

    initialize: function(options) {
        this.initItems().render().initCollectionEvents();
        this.listenTo(this.collection, 'edit', this.edit);
        this.editable = true;  // enables "New field" button
    },

    events: {
        'click button.new-comment': 'editEmpty',
        'click button.new-tag': 'editEmptyTag',
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

    editEmpty: function() {
        this.edit(new Annotation({
            "oa:hasTarget": this.collection.target,
            "oa:motivatedBy": {"@id": "oa:commenting"},
        }));
    },

    editEmptyTag: function() {
        this.edit(new Annotation({
            "oa:hasTarget": this.collection.target,
            "oa:motivatedBy": {"@id": "oa:tagging"},
        }))
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
