import { View } from '../core/view.js';
import annotationEditTemplate from './annotation.edit.view.mustache';
import annotationTagEditTemplate from './annotation.tag.edit.view.mustache';
import confirmDeletionTemplate from './annotation.confirm.deletion.mustache';
import {glossary} from "../utils/glossary";

export var AnnotationEditView = View.extend({
    tagName: 'div',
    className: 'form-inline',
    template: annotationEditTemplate,
    glossaryTemplate: annotationTagEditTemplate,
    events: {
        'submit': 'submit',
        'reset': 'reset',
        'keydown textarea': 'handleTextareaKeydown',
    },
    initialize: function(options) {
        _.assign(this, _.pick(options, ['existing', 'defaultText']));
        this.render().$el.popover({
            container: 'body',
            content: confirmDeletionTemplate(this),
            html: true,
            sanitize: false,
            placement: 'top',
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
        if (this.model.get('motivation') === 'oa:tagging') {
            glossary.on('update', this.render);
        }
        setTimeout(() => {
            var el = this.$('textarea').get(0);
            if (el) {
                el.focus();
                el.select();
            }
        }, 0);
    },
    render: function() {
        if (this.model.get('motivation') === 'oa:tagging') {
            this.$('select').select2('destroy');
            this.$el.html(this.glossaryTemplate({
                choices: glossary.parse(glossary.toJSON()),
                cid: this.cid,
            }));
            this.$('select').select2({
                dropdownParent: $('.modal-content'),
            });
            var tag = this.model.get('tagURL');
            if (tag) this.$('select').val(tag);
            this.$('select').trigger('change');
        } else {
            var text = this.model.get('oa:hasBody') || this.defaultText;
            this.$el.html(this.template({
                currentText: text,
                cid: this.cid,
            }));
        }
        return this;
    },
    remove: function() {
        this.$el.popover('dispose');
        this.trashConfirmer.off();
        this.trashCanceller.off();
        if (this.model.get('motivation') === 'oa:tagging') {
            this.$('select').select2('destroy');
        }
        return View.prototype.remove.call(this);
    },
    submit: function(event) {
        event.preventDefault();
        if (this.model.get('motivation') === 'oa:tagging') {
            this.model.set("tagURL", this.$('select').val());
        } else {
            this.model.set("oa:hasBody", this.$('textarea').val());
        }
        this.trigger('save', this);
    },
    reset: function(event) {
        event.preventDefault();
        this.trigger('cancel', this);
    },
    cancelTrash: function(event) {
        event.preventDefault();
        this.$('button[aria-label="Delete"]').popover('hide');
    },
    reallyTrash: function(event) {
        event.preventDefault();
        this.$('button[aria-label="Delete"]').popover('hide');
        this.trigger('trash', this);
    },
    handleTextareaKeydown: function(event) {
        /* We want to use a textarea to give the user more space, but
           most of the time they will write only one line. */
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.submit(event);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            this.reset(event);
        }
    }
});
