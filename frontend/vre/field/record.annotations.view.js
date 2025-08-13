import _ from 'lodash';
import recordAnnotationsTemplate from "./record.annotations.view.mustache";
import {CommentView} from "../annotation/comment.view";
import {Annotation} from "../annotation/annotation.model";
import {AnnotatableView} from "./annotatable.view";

export var RecordAnnotationsView = AnnotatableView.extend({
    template: recordAnnotationsTemplate,
    container: 'tbody',
    subview: CommentView,

    renderContainer: function() {
        this.$el.html(this.template(this));
        return this;
    },

    initialize: function(options) {
        this.editable = true;  // enables "New field" button
        AnnotatableView.prototype.initialize.call(this, options);
    },

    events: {
        'click button.new-comment': 'editEmpty',
        'click button.new-tag': 'editEmptyTag',
    },

    editEmpty: function() {
        this.edit(new Annotation({
            "oa:hasTarget": this.collection.underlying.target,
            "oa:motivatedBy": {"@id": "oa:commenting"},
        }));
    },

    editEmptyTag: function() {
        this.edit(new Annotation({
            "oa:hasTarget": this.collection.underlying.target,
            "oa:motivatedBy": {"@id": "oa:tagging"},
        }))
    },
});
