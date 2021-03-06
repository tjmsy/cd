'use strict';
import React from 'react';
import {MatchCard} from './MatchCard.jsx';
import {t} from './Quiz.jsx';
import Dialog from 'material-ui/lib/dialog';
import RaisedButton from 'material-ui/lib/raised-button';

var update = require('react-addons-update');

export class MatchCards extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
        // use what we get as a basis for our own set of questions
        // which we track ourselves
        questions: this.props.questions,
        selectedIdx: null,
        matched: 0,
        attempts: 0,
        elapsed: 0
      };
  }

    componentDidMount() {
      this.matchTimer = setInterval(this.onTick, 1000);
    }

  componentWillUnmount() {
   clearInterval(this.matchTimer);
  }

  onTick = () => {
    if (this.state.matched < (this.state.questions.length / 2)) {
      this.setState({elapsed: this.state.elapsed + 1});
    }
  }

  onCheckMatch = (idx) => {
    var a1, a2, selected, newQuestions, matched, attempts;
    a1 = this.state.questions[idx];
    matched = this.state.matched;
    attempts = this.state.attempts;
    if (this.state.selectedIdx !== null) {
      // card already selected: is this a match?
      attempts = attempts + 1;
      a2 = this.state.questions[this.state.selectedIdx];
      // match if same code and different card types
      if ((a1.code === a2.code) && (a1.type !== a2.type)) {
        // correct match
        a2.selected = false;
        a1.gotIt = true;
        a2.gotIt = true;
        matched = matched + 1;
      } else {
        // not a match
        a2.selected = false;
      }
      selected = null;
    } else {
      // first selected card
      a1.selected = true;
      selected = idx;
    }
    newQuestions = update(this.state.questions, {[idx]: {$set: a1}});
    if (a2) {
      newQuestions = update(newQuestions, {[this.state.selectedIdx]: {$set: a2}});
    }
    this.setState({
      questions: newQuestions,
      selectedIdx: selected,
      matched: matched,
      attempts: attempts
    })
    if (matched === (newQuestions.length / 2)) {
      this.props.onFinished(true, matched, attempts);
    }
  }

  handleClose = () => {
    this.props.onFinished(false);
  }

  render() {
    let self = this;
    let cards = this.state.questions.map(function(q, i) {
      return(
        <MatchCard
          idx={i}
          key={i}
          question={q}
          onClick={self.onCheckMatch}
        />
      );
    });
    let status = this.state.matched + ' ' + t('matched') + '. ';
    status = status + (this.state.attempts - this.state.matched) + ' ' + t('mistakes');
    status = status + '. ' + this.state.elapsed + ' ' + t('seconds') + '.';
    const actions = [
      <RaisedButton
        key={1}
        label={t('Close')}
        secondary={true}
        onTouchTap={this.handleClose}
      />
    ];
    return(
      <Dialog
        title={status}
        modal={true}
        open={this.props.open}
        actions={actions}
        autoScrollBodyContent={true}
        contentStyle={{width: '95%', maxWidth: 'none'}}
        onRequestClose={this.handleClose}
      >
        {cards}
      </Dialog>
    );
  }
}
