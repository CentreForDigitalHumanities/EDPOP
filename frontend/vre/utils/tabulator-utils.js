import _ from 'lodash';
import {Model, Collection} from 'backbone';
import {MappedCollection} from './mapped.collection.js';
import {
    BIBLIOGRAPHICAL,
    biblioProperties,
    BIOGRAPHICAL,
    bioProperties
} from './record-ontology';
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
        icon.classList.add("fa");
        icon.classList.add("fa-fw");
        if (column.isVisible()) icon.classList.add("fa-check");

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
                // toggle current column visibility
                column.toggle();

                // change menu item icon
                if (column.isVisible()) {
                    icon.classList.add("fa-check");
                } else {
                    icon.classList.remove("fa-check");
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
const standardColumns = Object.fromEntries([BIBLIOGRAPHICAL, BIOGRAPHICAL].map((recordClass) => {
    let propertyList;
    if (recordClass === BIBLIOGRAPHICAL) {
        propertyList = biblioProperties;
    } else if (recordClass === BIOGRAPHICAL) {
        propertyList = bioProperties;
    }
    const columns = new MappedCollection(
        propertyList,
        property2definition,
        {model: ColumnDefinition, comparator: byPreference},
    );
    return [recordClass, columns];
}));

/**
 * Callback for Tabulator's `autoColumnsDefinitions`. It always returns all
 * columns defined in {@link standardColumns}, but leverages the autodetected
 * columns to determine which columns should be visible. Columns that are both
 * preferred and present in the data are visible, all other columns are
 * invisible.
 * @param autodetected - list of automatically detected columns by Tabulator
 * @param {string} recordClass - the value of BIBLIOGRAPHICAL or BIOGRAPHICAL
 */
export function adjustDefinitions(autodetected, recordClass) {
    const customizedColumns = standardColumns[recordClass].clone();
    _.each(autodetected, autoColumn => {
        if (!(autoColumn.field in columnProperties)) return;
        const customColumn = customizedColumns.get(autoColumn.field);
        customColumn && customColumn.set('visible', true);
    });
    return customizedColumns.toJSON();
}
