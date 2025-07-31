import { Record } from "../record/record.model";

export var BlankRecordModel = Record.extend({
    url: '/api/blank-record/',

    createRecord: function(options) {
        return this.save({collection: this.get('collection')}, _.extend({type: 'POST'}, options));
    }
});
