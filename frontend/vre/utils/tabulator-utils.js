import _ from 'lodash';
import {Model, Collection} from 'backbone';
import {MappedCollection} from './mapped.collection.js';
import {biblioAndBioProperties} from './record-ontology';
import {getStringLiteral} from './jsonld.model';
import {typeTranslation} from './generic-functions.js';
import recordTypeIcon from '../record/record.type.icon.mustache';

/**
 * A Tabulator menu to hide and show the available columns.
 * Adapted from: https://tabulator.info/examples/6.2#menu
 */
export const columnChooseMenu = function(){
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
        icon.classList.add("glyphicon");
        icon.classList.add(column.isVisible() ? "glyphicon-check" : "glyphicon-unchecked");

        // build label
        let label = document.createElement("span");
        let title = document.createElement("span");

        title.textContent = " " + definition.title;

        label.appendChild(icon);
        label.appendChild(title);

        // create menu item
        menu.push({
            label: label,
            action: function(e){
                // prevent menu closing
                e.stopPropagation();

                // toggle current column visibility
                column.toggle();

                // change menu item icon
                if (column.isVisible()) {
                    icon.classList.remove("glyphicon-unchecked");
                    icon.classList.add("glyphicon-check");
                } else {
                    icon.classList.remove("glyphicon-check");
                    icon.classList.add("glyphicon-unchecked");
                }
            }
        });
    }

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
const standardColumns = new MappedCollection(
    biblioAndBioProperties,
    property2definition,
    {model: ColumnDefinition, comparator: byPreference},
);

// `@type` is not a property, so we add it as a special case. This enables the
// person/book icons at the left end of every row.
standardColumns.unshift({
    field: 'type',
    title: 'Type',
    visible: true,
    headerContextMenu: columnChooseMenu,
    formatter: cell => recordTypeIcon(typeTranslation(cell.getValue())),
    hozAlign: 'right',
    tooltip: (e, cell) => cell.getValue().slice(9, -6),
    width: 48,
    // The `_ucid` is an implementation detail of `MappedCollection`. It appears
    // here because mapped collections are not really intended for non-mapped
    // additions or other modifications.
    _ucid: {},
}, {convert: false});

/**
 * Callback for Tabulator's `autoColumnsDefinitions`. It always returns all
 * columns defined in {@link standardColumns}, but leverages the autodetected
 * columns to determine which columns should be visible. Columns that are both
 * preferred and present in the data are visible, all other columns are
 * invisible.
 */
export function adjustDefinitions(autodetected) {
    const customizedColumns = standardColumns.clone();
    _.each(autodetected, autoColumn => {
        if (!(autoColumn.field in columnProperties)) return;
        const customColumn = customizedColumns.get(autoColumn.field);
        customColumn && customColumn.set('visible', true);
    });
    return customizedColumns.toJSON();
}
