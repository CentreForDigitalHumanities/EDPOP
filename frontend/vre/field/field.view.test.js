import assert from 'assert';
import sinon from 'sinon';
import { each } from 'lodash';
import { Model } from 'backbone';
import { FieldView } from './field.view';
import {Record} from "../record/record.model";
import {Field} from "./field.model";

describe('FieldView', function() {
    beforeEach(function() {
        this.model = new Field({
            'key': 'edpoprec:Color',
            'value': {
                '@type': 'edpoprec:Field',
                'edpoprec:originalText': 'green',
            },
            context: 'me, myself and I',
        });
        this.view = new FieldView({model: this.model});
    });

    afterEach(function() {
        this.view.remove();
    });

    it('renders with the contents of the field', function() {
        var text = this.view.$el.text();
        assert(text.includes(this.model.getMainDisplay()));
    });

    it('renders with the display name of the field type', function() {
        var text = this.view.$el.text();
        assert(text.includes(this.model.getFieldInfo().name));
    });

    it('updates when the value attribute changes', function() {
        var oldText = this.view.$el.text();
        var oldExpectedTest = this.model.getMainDisplay();
        var newValue = {
            '@type': 'edpoprec:Field',
            'edpoprec:originalText': 'red',
        };
        var newExpectedText = 'red';
        this.model.set('value', newValue);
        var newText = this.view.$el.text();
        assert(newText !== oldText);
        assert(!oldText.includes(newExpectedText));
        assert(newText.includes(newExpectedText));
        assert(!newText.includes(oldExpectedTest));
    });
});
