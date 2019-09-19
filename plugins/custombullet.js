import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import { toWidget, viewToModelPositionOutsideModelElement } from '@ckeditor/ckeditor5-widget/src/utils';
import Widget from '@ckeditor/ckeditor5-widget/src/widget';
import Command from '@ckeditor/ckeditor5-core/src/command';
import ButtonView from '@ckeditor/ckeditor5-ui/src/button/buttonview';
import boldIcon from '@ckeditor/ckeditor5-basic-styles/theme/icons/bold.svg';

/**
 * The name of the custom fields plugin.
 */
export const CUSTOM_FIELDS = 'customBullet';

export default class CustomBullet extends Plugin {
	/**
	 * @inheritDoc
	 */
	static get requires() {
		return [ CustomBulletEditing, CustomBulletUI ];
	}

	/**
	 * @inheritDoc
	 */
	static get pluginName() {
		return 'customBullet';
	}
}

class CustomBulletCommand extends Command {
	execute() {
		const editor = this.editor;

		editor.model.change( writer => {
			/*
			const selection = editor.model.document.selection;
			const currentAttributes = selection.getAttributes();
			const insertPosition = selection.focus;

			writer.insertText( '[' + value.value + ']', currentAttributes, insertPosition );
*/
			// const content = '[' + value.value + ']';
			// const viewFragment = editor.data.processor.toView( content );
			// const modelFragment = editor.data.toModel( viewFragment );
			// const currentAttributes = editor.model.document.selection.getAttributes();
			// editor.model.insertContent( writer.createText( '[!' + value.value + ']' ), currentAttributes );
			// Create a <customfield> elment with the "name" attribute...
			const customBullet = writer.createElement( 'customBullet', { name: 'Hello' } );
			// ... and insert it into the document.
			editor.model.insertContent( customBullet );
			// Put the selection on the inserted element.
			// writer.setSelection( customBullet, 'on' );
		} );
	}

	refresh() {
		const model = this.editor.model;
		const selection = model.document.selection;
		const isAllowed = model.schema.checkChild( selection.focus.parent, 'customBullet' );
		this.isEnabled = isAllowed;
	}
}

class CustomBulletUI extends Plugin {
	init() {
		const editor = this.editor;
		const t = editor.t;

		// Add bold button to feature components.
		editor.ui.componentFactory.add( 'customBullet', locale => {
			const command = editor.commands.get( 'customBullet' );
			const view = new ButtonView( locale );

			view.set( {
				label: t( 'TAB' ),
				icon: boldIcon,
				keystroke: 'TAB',
				tooltip: true
			} );

			view.bind( 'isOn', 'isEnabled' ).to( command, 'value', 'isEnabled' );

			// Execute command.
			this.listenTo( view, 'execute', () => editor.execute( 'customBullet' ) );

			return view;
		} );
	}
}

class CustomBulletEditing extends Plugin {
	static get requires() {
		return [ Widget ];
	}

	init() {
		this._defineSchema();
		this._defineConverters();

		this.editor.commands.add( 'customBullet', new CustomBulletCommand( this.editor ) );

		// ADDED
		this.editor.editing.mapper.on( 'viewToModelPosition',
			viewToModelPositionOutsideModelElement( this.editor.model, viewElement => viewElement.hasClass( 'customBullet' ) )
		);
	}

	_defineSchema() {
		const schema = this.editor.model.schema;

		schema.register( 'customBullet', {
			// Allow wherever text is allowed:
			allowWhere: '$text',

			// The customfield will act as an inline node:
			isInline: false,

			// The inline widget is self-contained so it cannot be split by the caret and it can be selected:
			isObject: false,

			// The customfield can have many types, like date, name, surname, etc:
			allowAttributes: [ 'name', 'style' ]
		} );
	}

	_defineConverters() {
		const conversion = this.editor.conversion;

		conversion.for( 'upcast' ).elementToElement( {
			view: {
				name: 'span',
				classes: [ 'customBullet' ]
			},
			model: ( viewElement, modelWriter ) => {
				// Extract the "name" from "{name}".
				// const name = viewElement.getChild( 0 ).data.slice( 1, -1 );

				return modelWriter.createElement( 'customBullet', { name: 'Hello' } );
			}
		} );

		conversion.for( 'editingDowncast' ).elementToElement( {
			model: 'customBullet',
			view: ( modelItem, viewWriter ) => {
				const widgetElement = createCustomfieldView( modelItem, viewWriter );

				// Enable widget handling on a customfield element inside the editing view.
				return toWidget( widgetElement, viewWriter );
			}
		} );

		conversion.for( 'dataDowncast' ).elementToElement( {
			model: 'customBullet',
			view: createCustomfieldView
		} );

		// Helper method for both downcast converters.
		function createCustomfieldView( modelItem, viewWriter ) {
			const customfieldView = viewWriter.createContainerElement( 'span', {
				class: 'customBullet'
			} );

			// Insert the customfield name (as a text).
			const innerText = viewWriter.createText( '•' );
			viewWriter.insert( viewWriter.createPositionAt( customfieldView, 0 ), innerText );

			return customfieldView;
		}
	}
}
