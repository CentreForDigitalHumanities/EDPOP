import _ from 'lodash';

import { Record } from "../record/record.model";

export var BlankRecordModel = Record.extend({
    urlRoot: '/api/blank-record/',

    createRecord: function(options) {
        options = _.extend({contentType: 'application/json'}, options);
        return this.save({collection: this.get('collection')}, options);
    }
});
