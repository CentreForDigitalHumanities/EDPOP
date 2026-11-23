import assert from 'assert';
import sinon from 'sinon';

import _ from 'lodash';
import { Model, Collection } from 'backbone';

import { vreChannel } from '../radio.js';
import { FieldView } from './field.view';

describe('FieldView', function() {
    var model, view, collection;

    before(() => {
        vreChannel.reply('projects:current', _.constant({id: 1}));
    });

    beforeEach(() => {
        model = new Model({id: 1, record: {id: 2}});
        collection = new Collection;
        view = new FieldView({model, collection});
    });

    afterEach(() => {
        view.remove();
        collection.off().reset();
        model.off().clear();
    });

    after(() => {
        vreChannel.stopReplying('projects:current');
    });

    describe('makeEdit', () => {
        it('includes non-null originalText', () => {
            var text = 'something';
            var target = new Model({originalText: text});
            var edit = view.makeEdit(target);
            assert(edit.get('edpopcol:originalText') === text);
        });

        it('omits nullish originalText', () => {
            var edit = view.makeEdit(new Model);
            assert(!edit.has('edpopcol:originalText'));
        });

        it('includes non-null originalText even if empty', () => {
            var target = new Model({originalText: ''});
            var edit = view.makeEdit(target);
            assert(edit.get('edpopcol:originalText') === '');
        });
    });
});
