import assert from 'assert';
import sinon from 'sinon';

import {
    objectAsUrlParams,
    canonicalSort,
} from './generic-functions';

describe('generic functions', function() {
    describe('objectAsUrlParams', function() {
        it('converts empty object to empty string', function() {
            assert(objectAsUrlParams({}) === '');
        });

        it('handles strings, numbers and booleans', function() {
            assert(objectAsUrlParams({name: 'john'}) === 'name=john');
            assert(objectAsUrlParams({age: 3}) === 'age=3');
            assert(objectAsUrlParams({happy: true}) === 'happy=true');
        });

        it('handles multiple keys', function() {
            assert(objectAsUrlParams({
                name: 'john',
                age: 3,
                happy: true,
            }) === 'name=john&age=3&happy=true');
        });
    });

    describe('canonicalSort', function() {
        it('sorts title before contributor', function() {
            assert(
                canonicalSort('edpoprec:title') <
                canonicalSort('edpoprec:contributor')
            );
        });

        it('sorts contributor before holdings', function() {
            assert(
                canonicalSort('edpoprec:contributor') <
                canonicalSort('edpoprec:holdings')
            );
        });

        it('defaults to lowest priority', function() {
            assert(canonicalSort('banana') === 100);
        });
    });
});
