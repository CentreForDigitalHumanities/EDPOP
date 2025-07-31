import { Record } from "../record/record.model";

export var BlankRecordModel = Record.extend({
    urlRoot: '/api/blank-record/',

    createRecord: function(options) {
        return this.save({collection: this.get('collection')}, options);
    }
});
