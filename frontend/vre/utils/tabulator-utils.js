import _ from 'lodash';
import {Model, Collection} from 'backbone';
import {MappedCollection} from './mapped.collection.js';
import {
    BIBLIOGRAPHICAL,
    biblioProperties,
    BIOGRAPHICAL,
    bioProperties,
    biblioAndBioProperties,
} from './record-ontology';
import {getStringLiteral} from './jsonld.model';
import {typeTranslation} from './generic-functions.js';
import recordTypeIcon from '../record/record.type.icon.mustache';

/**
 * A Tabulator menu to hide and show the available columns.
 * Adapted from: https://tabulator.info/examples/6.2#menu
 */
export const columnChooseMenu = function(){
    // This function is called with the Tabular object as its context
    const menu = [];
    const columns = this.getColumns();
    menu.push({
        label: "Show/hide columns",
        disabled: true,
    }, {
        separator: true,
    });

    for (let column of columns) {
        const definition = column.getDefinition();
        if (definition.field === "model" || !definition.title) {
            /* Do not add the 'model' column (for internal use only) and
               do not add columns that do not have a title */
            continue;
        }
        // create checkbox element using font awesome icons
        const icon = document.createElement("i");
        icon.classList.add("fa");
        icon.classList.add("fa-fw");
        if (column.isVisible()) icon.classList.add("fa-check");

        // build label
        let label = document.createElement("span");
        let title = document.createElement("span");

        // For textContent, prefer the headerTooltip, which is the text representation in case the field
        title.textContent = " " + (definition.headerTooltip || definition.title);

        label.appendChild(icon);
        label.appendChild(title);

        // create menu item
        menu.push({
            label: label,
            action: function(e){
                // toggle current column visibility
                column.toggle();

                // Redraw the table so that the columns are realigned
                this.redraw();

                // change menu item icon
                if (column.isVisible()) {
                    icon.classList.add("fa-check");
                } else {
                    icon.classList.remove("fa-check");
                }
            }.bind(this)
        });
    }

    menu.push({
        separator: true
    }, {
        label: "Restore ordering",
        action: function (e) {
            if (this.options.initialSort) {
                this.setSort(this.options.initialSort);
            } else {
                this.clearSort();
            }
        }.bind(this)
    });

    return menu;
};

const defaultColumnFeatures = {
    visible: false,
    headerFilter: true,
    headerContextMenu: columnChooseMenu,
};

/**
 * Preferred columns, which are prioritized in the given order over other
 * columns. Keys are field names, values are objects with any column definition
 * overrides.
 */
const columnProperties = {
    type: {},
    'edpoprec:title': {
        widthGrow: 5,
    },
    'edpoprec:placeOfPublication': {},
    'edpoprec:dating': {
        widthGrow: 0.5,
    },
    'edpoprec:publisherOrPrinter': {},
    'edpoprec:contributor': {},
    'edpoprec:name': {},
    'edpoprec:placeOfActivity': {},
    'edpoprec:activity': {},
};

/**
 * Table of the form `{type: 0, 'edpoprec:title': 1, ...}`, derived from
 * {@link columnProperties}.
 */
const columnOrder = _.invert(_.keys(columnProperties));

/**
 * Model wrapper for Tabulator's column definition schema.
 * @class
 */
const ColumnDefinition = Model.extend({
    idAttribute: 'field',
});

/**
 * Comparator function for {@link Collection#sort}. Columns that appear in
 * {@link columnOrder} are sorted by their value in that table, all other
 * columns after that.
 * @param {ColumnDefinition} columnDef - Column definition model.
 * @returns {number} Order of preference, with lower numbers indicating greater
 * preference.
 */
function byPreference(columnDef) {
    const definedOrder = columnOrder[columnDef.id];
    return definedOrder != null ? definedOrder : columnOrder.length;
}

/**
 * Given a property in the EDPOP Record Ontology, return the corresponding
 * Tabulator column definition, taking special cases into account.
 * @param {JsonLdModel} property - JSON-LD model of the ontology property.
 * @returns {object} Tabulator column definition (suitable as payload for a
 * {@link ColumnDefinition}).
 */
function property2definition(property) {
    return _.assign({
        title: getStringLiteral(property.get('skos:prefLabel')),
        field: property.id,
    }, defaultColumnFeatures, columnProperties[property.id])
}

/**
 * Set of all available columns in the Tabulator results table. Contained as a
 * Backbone.Collection for easy referencing and computation. Call the `.toJSON`
 * method in order to extract the column definitions in the format that
 * Tabulator understands.
 */
const standardColumns = _.mapValues({
    [BIBLIOGRAPHICAL]: biblioProperties,
    [BIOGRAPHICAL]: bioProperties,
    [null]: biblioAndBioProperties,
}, (propertyList) => {
    return new MappedCollection(
        propertyList,
        property2definition,
        {model: ColumnDefinition, comparator: byPreference},
    );
});

/**
 * To be used as the `valuesLookup` parameter of the `headerFilterParams`
 * option of a Tabulator column definition. The return value is an array
 * of filter options. The options we want to show are all unique values
 * of the column, with support for cells that contain multiple values
 * separated by a comma.
 */
function getUniqueValues(cell) {
    var cells = cell.getColumn().getCells();
    var data = _.map(cells, c => c.getValue() && c.getValue().split(', '));
    data = _.flatten(data);
    _.remove(data, _.isEmpty);
    data = _.uniq(data);
    data = _.sortBy(data);
    data.unshift({
        label: '(all)',
        value: '',
    })
    return data;
}

/**
 * Get additional column definitions based on the type of record list (catalog or collection).
 * @param {string} type - the kind of record list: "catalog" or "collection"
 */
function getAdditionalColumns(type) {
    return [{
        field: 'hasAnnotations',
        title: "<i class='fa-regular fa-comment'></i>",
        headerTooltip: "Has annotations",
        visible: type === 'collection',
        formatter: 'tickCross',
        formatterParams: {
            tickElement: "<i class='fa-regular fa-comment'></i>",
            crossElement: "",
        },
        width: 54,
        tooltip: (e, cell) => cell.getValue() ? "Record has annotations" : "No annotations",
        headerContextMenu: columnChooseMenu,
    }, {
        field: 'tags',
        title: 'Glossary',
        headerFilter: 'list',
        headerFilterParams: {
            valuesLookup: getUniqueValues,
        },
        visible: type === 'collection',
        headerContextMenu: columnChooseMenu,
    }, {
        field: 'fromCatalog',
        title: 'From catalog',
        visible: type === 'collection',
        headerContextMenu: columnChooseMenu,
        tooltip: (e, cell) => cell.getValue(),
    }];
}

/**
 * Callback for Tabulator's `autoColumnsDefinitions`. It always returns all
 * columns defined in {@link standardColumns}, but leverages the autodetected
 * columns to determine which columns should be visible. Columns that are both
 * preferred and present in the data are visible, all other columns are
 * invisible.
 * @param autodetected - list of automatically detected columns by Tabulator
 * @param {string} recordClass - the value of BIBLIOGRAPHICAL or BIOGRAPHICAL
 * @param {string} type - the kind of record list: "catalog" or "collection"
 */
export function adjustDefinitions(autodetected, recordClass, type) {
    const customizedColumns = standardColumns[recordClass].clone();
    _.each(autodetected, autoColumn => {
        if (!(autoColumn.field in columnProperties)) return;
        const customColumn = customizedColumns.get(autoColumn.field);
        customColumn && customColumn.set('visible', true);
    });
    customizedColumns.add(getAdditionalColumns(type));
    return customizedColumns.toJSON();
}
