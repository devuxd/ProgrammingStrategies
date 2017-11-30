import React from 'react';

class ValueView extends React.Component {

	constructor() {
		
		super();
		
		this.state = {
			value: "",
			editing: false
		};
		
		this.renderValue = this.renderValue.bind(this);
		this.edit = this.edit.bind(this);
		this.save = this.save.bind(this);
		this.handleChange = this.handleChange.bind(this);
		this.borderStyle = {border: '1px solid lightGray', padding: '1em', display: 'inline-block'};
		
	}

	render() {
		return (
			<div style={this.borderStyle}>
				{
					this.state.editing === true ?
						<textarea autoFocus onBlur={this.save} value={this.state.value} onChange={this.handleChange}></textarea> :
						<div style={{cursor: "pointer"}} onClick={this.edit}>
							{ this.renderValue(this.state.value) }
						</div>
				}
			</div>
		);
	}
	
	// Renders a view appropriate for the string's content.
	renderValue(value) {
		
		value = value.trim();
		
		if(value === '' || value === 'nothing') return this.renderNothing();
		else if(value.split(',').length > 1) return this.renderList(value);
		else if(value.match(/^https?:\/\/[a-zA-Z0-9_\-]+\.?[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-??]+$/)) return this.renderLink(value);
		else return value;
		
	}
	
	renderNothing() {
		
		return (
			<div style={{fontStyle: 'italic'}}>nothing</div>
		);
		
	}

	renderList(value) {
		
		return value.split(',').map((item, index) => {
			return <span style={this.borderStyle} key={index}>{ this.renderValue(item.trim()) }</span>;
		});
		
	}

	renderLink(value) {
		
		return <a href={value}>{value}</a>;
		
	}
	
	edit() { 
		
		// Set to edit. Expects text area to auto-focus itself.
		this.setState({ editing: true });
	
	}

	save() {

		// Return to rendering the view.		
		this.setState({ editing: false }); 
		
	}
	
	handleChange(event) {
		
	    this.setState({value: event.target.value});
		
	}
	
}

export { ValueView };