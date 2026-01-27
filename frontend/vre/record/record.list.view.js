import _ from 'lodash';
import Backbone from "backbone";
import Tabulator from "tabulator";

import {vreChannel} from "../radio";
import {adjustDefinitions} from "../utils/tabulator-utils";
import {BIBLIOGRAPHICAL, BIOGRAPHICAL} from "../utils/record-ontology";

function getModelId(rowData) {
    return rowData.model.id;
}

function getDefaultSort(recordClass, type) {
    if (type === "catalog") {
        /* Do not sort catalog results by default, because the API's original
           order has to be preserved. */
        return null;
    }
    var sortColumn;
    if (recordClass === BIBLIOGRAPHICAL) {
        sortColumn = "edpoprec:title";
    } else if (recordClass === BIOGRAPHICAL) {
        sortColumn = "edpoprec:name";
    }
    return [{
        column: sortColumn,
        dir: "asc",
    }];
}

export var RecordListView = Backbone.View.extend({
    id: "record-list",
    /**
     * The Tabulator instance
     * @type {Tabulator}
     */
    table: null,
    /**
     * The kind of record list ("collection" or "catalog")
     * @type {?string}
     */
    type: null,
    /**
     * The record class (BIBLIOGRAPHICAL or BIOGRAPHICAL)
     * @type {?string}
     */
    recordClass: null,
    highlightedRow: null,

    initialize: function(options) {
        _.assign(this, _.pick(options, ['recordClass', 'type']));
        this.listenTo(this.collection, 'annotations:loaded', this.insertRowAnnotations);
        this.render().listenTo(this.collection, 'update', this.render);
    },

    render: function() {
        if (this.collection.length === 0) return this.removeTable();
        const data = this.collection.toTabularData();
        _.invokeMap(this.collection.models, 'getAnnotations');
        if (this.table === null) return this.createTable(data);
        this.table.replaceData(data);
        // TODO: replace by _.invoke when switching to Underscore
        return this;
    },

    createTable: function(initialData) {
        this.table = new Tabulator(this.el, {
            height: "calc(100vh - 360px)", // set height to table approximately to what is left of viewport height
            data: initialData,
            autoColumns: true,
            autoColumnsDefinitions: (autodetected) => {return adjustDefinitions(autodetected, this.recordClass, this.type)},
            layout: "fitColumns",
            initialSort: getDefaultSort(this.recordClass, this.type),
            resizableColumnFit: true,
            movableColumns: true,
            clipboard: "copy",
            clipboardCopyRowRange: "selected",
            rowHeader: {
                width: 50,
                formatter: "rowSelection",
                titleFormatter: "rowSelection",
                headerSort: false,
                resizable: false,
                frozen:true,
                headerHozAlign:"center",
                hozAlign:"center",
                cellClick:function(e, cell){
                    cell.getRow().toggleSelect();
                },
            },
            rowFormatter: function(row) {
                var data = row.getData();
                if (data.highlighted === true) {
                    row.getElement().classList.add("highlighted");
                } else {
                    row.getElement().classList.remove("highlighted");
                }
            },
            headerFilterLiveFilterDelay: 0,
        });
        this.table.on("cellClick", (e, cell) => {
            const column = cell.getColumn();
            if (!column.getField()) {
                /* Check if the user clicked the selection column.
                   In that case do not open the detail view, only
                   toggle selection.
                 */
                return;
            }
            const model = cell.getRow().getData().model;
            vreChannel.trigger('displayRecord', model);
        });
        vreChannel.on('highlightRecord', this.highlightRecord.bind(this));
        vreChannel.on('unhighlightRecord', this.unhighlightRecord.bind(this));
        vreChannel.reply('getNextRecord', this.getNextRecord.bind(this));
        vreChannel.reply('getPreviousRecord', this.getPreviousRecord.bind(this));
        return this;
    },

    insertRowAnnotations: function(model) {
        var tabularData = model.toTabularData();
        this.table.updateData([tabularData]);
    },

    removeTable: function() {
        if (this.table) {
            this.table.destroy();
            this.table = null;
        }
        return this;
    },

    currentSelection: function() {
        return _.map(this.table.getSelectedData(), 'model');
    },

    downloadXLSX: function() {
        this.table.download("xlsx", "edpop.xlsx", {sheetName: "EDPOP"});
        return this;
    },

    downloadCSV: function() {
        this.table.download("csv", "edpop.csv");
        return this;
    },

    highlightRecord: function(recordModel) {
        this.unhighlightRecord();
        var toHighlight = this.table.getRow(recordModel.id);
        toHighlight.scrollTo("center", false);
        toHighlight.getData().highlighted = true;
        toHighlight.reformat();
        this.highlightedRow = toHighlight;
    },

    unhighlightRecord: function() {
        if (this.highlightedRow) {
            this.highlightedRow.getData().highlighted = false;
            this.highlightedRow.reformat();
        }
    },

    getNextRecord: function(recordModel) {
        var currentRow = this.table.getRow(recordModel.id);
        var nextRow = currentRow.getNextRow();
        if (nextRow) {
            return nextRow.getData().model;
        }
    },

    getPreviousRecord: function(recordModel) {
        var currentRow = this.table.getRow(recordModel.id);
        var previousRow = currentRow.getPrevRow();
        if (previousRow) {
            return previousRow.getData().model;
        }
    },

    remove: function() {
        vreChannel.off('highlightRecord');
        vreChannel.off('unhighlightRecord');
        vreChannel.off('getNextRecord');
        vreChannel.off('getPreviousRecord');
        this.removeTable();
        Backbone.View.prototype.remove.call(this);
    },
});
