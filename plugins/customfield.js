import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import { toWidget, viewToModelPositionOutsideModelElement } from '@ckeditor/ckeditor5-widget/src/utils';
import Widget from '@ckeditor/ckeditor5-widget/src/widget';
import Command from '@ckeditor/ckeditor5-core/src/command';

import { addListToDropdown, createDropdown } from '@ckeditor/ckeditor5-ui/src/dropdown/utils';
import Collection from '@ckeditor/ckeditor5-utils/src/collection';
import Model from '@ckeditor/ckeditor5-ui/src/model';

/**
 * The name of the custom fields plugin.
 */
export const CUSTOM_FIELDS = 'customFields';

export default class CustomField extends Plugin {
	/**
	 * @inheritDoc
	 */
	static get requires() {
		return [ CustomfieldEditing, CustomfieldUI ];
	}

	/**
	 * @inheritDoc
	 */
	static get pluginName() {
		return 'CustomField';
	}
}

class CustomfieldCommand extends Command {
	execute( { value } ) {
		const editor = this.editor;

		editor.model.change( writer => {
			// const content = '[' + value.value + ']';
			// const viewFragment = editor.data.processor.toView( content );
			// const modelFragment = editor.data.toModel( viewFragment );
			editor.model.insertContent( writer.createText( '[!' + value.value + ']' ) );

			// Create a <customfield> elment with the "name" attribute...
			// const customfield = writer.createElement( 'customfield', { name: value } );
			// ... and insert it into the document.
			// editor.model.insertContent( customfield );
			// Put the selection on the inserted element.
			// writer.setSelection( customfield, 'on' );
		} );
	}

	refresh() {
		const model = this.editor.model;
		const selection = model.document.selection;
		const isAllowed = model.schema.checkChild( selection.focus.parent, 'customfield' );
		this.isEnabled = isAllowed;
	}
}

class CustomfieldUI extends Plugin {
	init() {
		const editor = this.editor;
		const t = editor.t;
		const customFieldNames = editor.config.get( CUSTOM_FIELDS + '.types' );

		// The "customfield" dropdown must be registered among the UI components of the editor
		// to be displayed in the toolbar.
		editor.ui.componentFactory.add( 'customfield', locale => {
			const dropdownView = createDropdown( locale );

			// Populate the list in the dropdown with items.
			addListToDropdown( dropdownView, getDropdownItemsDefinitions( customFieldNames ) );

			dropdownView.buttonView.set( {
				// The t() function helps localize the editor. All strings enclosed in t() can be
				// translated and change when the language of the editor changes.
				label: t( 'Insert Custom Field' ),
				tooltip: true,
				withText: true
			} );

			// Execute the command when the dropdown item is clicked (executed).
			this.listenTo( dropdownView, 'execute', evt => {
				editor.execute( 'customfield', { value: evt.source.commandParam } );
				editor.editing.view.focus();
			} );

			return dropdownView;
		} );
	}
}

function getDropdownItemsDefinitions( customFieldNames ) {
	const itemDefinitions = new Collection();

	for ( const name of customFieldNames ) {
		const definition = {
			type: 'button',
			model: new Model( {
				commandParam: name,
				label: name.label,
				withText: true
			} )
		};

		// Add the item definition to the collection.
		itemDefinitions.add( definition );
	}

	return itemDefinitions;
}

class CustomfieldEditing extends Plugin {
	/**
	 * @inheritDoc
	 */
	constructor( editor ) {
		super( editor );

		// Define default configuration using font families shortcuts.
		editor.config.define( CUSTOM_FIELDS, {
			types: [
				{ label: 'Default Option', value: 'defaultVal' }
			]
		} );
	}

	static get requires() {
		return [ Widget ];
	}

	init() {
		this._defineSchema();
		this._defineConverters();

		this.editor.commands.add( 'customfield', new CustomfieldCommand( this.editor ) );

		this.editor.editing.mapper.on(
			'viewToModelPosition',
			viewToModelPositionOutsideModelElement( this.editor.model, viewElement => viewElement.hasClass( 'customfield' ) )
		);
	}

	_defineSchema() {
		const schema = this.editor.model.schema;

		schema.register( 'customfield', {
			// Allow wherever text is allowed:
			allowWhere: '$text',

			// The customfield will act as an inline node:
			isInline: true,

			// The inline widget is self-contained so it cannot be split by the caret and it can be selected:
			isObject: true,

			// The customfield can have many types, like date, name, surname, etc:
			allowAttributes: [ 'name' ]
		} );
	}

	_defineConverters() {
		const conversion = this.editor.conversion;

		conversion.for( 'upcast' ).elementToElement( {
			view: {
				name: 'span',
				classes: [ 'customfield' ]
			},
			model: ( viewElement, modelWriter ) => {
				// Extract the "name" from "{name}".
				const name = viewElement.getChild( 0 ).data.slice( 1, -1 );

				return modelWriter.createElement( 'customfield', { name } );
			}
		} );

		conversion.for( 'editingDowncast' ).elementToElement( {
			model: 'customfield',
			view: ( modelItem, viewWriter ) => {
				const widgetElement = createCustomfieldView( modelItem, viewWriter );

				// Enable widget handling on a customfield element inside the editing view.
				return toWidget( widgetElement, viewWriter );
			}
		} );

		conversion.for( 'dataDowncast' ).elementToElement( {
			model: 'customfield',
			view: createCustomfieldView
		} );

		// Helper method for both downcast converters.
		function createCustomfieldView( modelItem, viewWriter ) {
			const name = modelItem.getAttribute( 'name' );

			const customfieldView = viewWriter.createContainerElement( 'span', {
				class: 'customfield'
			} );

			// Insert the customfield name (as a text).
			const innerText = viewWriter.createText( '[' + name.toUpperCase() + ']' );
			viewWriter.insert( viewWriter.createPositionAt( customfieldView, 0 ), innerText );

			return customfieldView;
		}
	}
}
