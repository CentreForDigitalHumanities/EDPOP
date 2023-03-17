import { View } from 'backbone';
import annotationEditTemplate from './annotation.edit.view.mustache';
import confirmDeletionTemplate from './annotation.confirm.deletion.mustache';

export var AnnotationEditView = View.extend({
    tagName: 'tr',
    className: 'form-inline',
    template: annotationEditTemplate,
    events: {
        'submit': 'submit',
        'reset': 'reset',
    },
    initialize: function(options) {
        _.assign(this, _.pick(options, ['existing']));
        this.$el.popover({
             container: 'body',
             content: confirmDeletionTemplate(this),
             html: true,
             sanitize: false,
             placement: 'auto top',
             selector: 'button[aria-label="Delete"]',
             title: 'Really delete?',
         });
         var confirmSelector = '#confirm-delete-' + this.cid;
         this.trashConfirmer = $('body').one(
             'submit',
             confirmSelector,
             this.reallyTrash.bind(this)
         );
         this.trashCanceller = $('body').on(
             'reset',
             confirmSelector,
             this.cancelTrash.bind(this),
         );
    },
    render: function() {
        this.$el.html(this.template(
            _.extend({cid: this.cid}, this.model.attributes)
        ));
        return this;
    },
    remove: function() {
        this.$el.popover('destroy');
        this.trashConfirmer.off();
        this.trashCanceller.off();
        return View.prototype.remove.call(this);
    },
    submit: function(event) {
        event.preventDefault();
        var model = this.model;
        this.$('input').each(function(index, element) {
            model.set(this.name, $(this).val());
        });
        this.trigger('save', this);
    },
    reset: function(event) {
        event.preventDefault();
        this.trigger('cancel', this);
    },
    cancelTrash: function(event) {
         $(event.target).parents('.popover').popover('hide');
    },
    reallyTrash: function(event) {
        event.preventDefault();
        $(event.target).parents('.popover').popover('hide');
        this.trigger('trash', this);
    },
});