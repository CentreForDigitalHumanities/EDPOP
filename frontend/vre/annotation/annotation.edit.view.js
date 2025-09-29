import { View } from '../core/view.js';
import annotationEditTemplate from './annotation.edit.view.mustache';
import annotationTagEditTemplate from './annotation.tag.edit.view.mustache';
import confirmDeletionTemplate from './annotation.confirm.deletion.mustache';
import {glossary} from "../utils/glossary";

export var AnnotationEditView = View.extend({
    tagName: 'tr',
    className: 'form-inline',
    template: annotationEditTemplate,
    glossaryTemplate: annotationTagEditTemplate,
    events: {
        'submit': 'submit',
        'reset': 'reset',
    },
    initialize: function(options) {
        _.assign(this, _.pick(options, ['existing']));
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
    },
    render: function() {
        if (this.model.get('motivation') === 'oa:tagging') {
            this.$('select').select2('destroy');
            this.$el.html(this.glossaryTemplate({
                choices: glossary.toJSON(),
                cid: this.cid,
            }));
            this.$('select').select2({
                dropdownParent: $('.modal-content'),
            });
            if (this.model.getBody()) {
                this.$('select').val(this.model.getBody()["@id"]);
            }
            this.$('select').trigger('change');
        } else {
            this.$el.html(this.template({
                currentText: this.model.getBody(),
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
            this.model.set("oa:hasBody", this.$('select').val());
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
});
