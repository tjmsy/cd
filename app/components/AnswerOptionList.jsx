'use strict';
import React from 'react';
import DropDownMenu from 'material-ui/lib/DropDownMenu';
import MenuItem from 'material-ui/lib/menus/menu-item';
import {t} from './Quiz.jsx';

export class AnswerOptionList extends React.Component {
  handleChange = (event, index, value) => {
    this.props.onChange(value);
  }

  render() {
    let answers = this.props.possibleAnswers.map(function(number, i){
      return(
        <MenuItem value={number} primaryText={number} key={i}/>
      );
    });

    return(
      <div>
        <span>{t('Answers per question')}</span>
        <DropDownMenu
          value={this.props.setting}
          onChange={this.handleChange}
        >
          {answers}
        </DropDownMenu>
      </div>
    )
  }
}
