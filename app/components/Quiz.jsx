'use strict';
/*global _*/
/*global $*/

import React from 'react';
import {StartPage} from './StartPage.jsx'
import {MenuBar} from './Menu.jsx'
import {QuestionPage} from './QuestionPage.jsx'
import {Results,
        loadAllTimeResults, saveAllTimeResults,
        loadName, saveName,
        loadLanguage, saveLanguage} from './Results.jsx'
import {ResultMessage} from './ResultMessage.jsx'
import {SYMBOLS_TO_TEXT, MATCH_ITEMS, VIEW_RESULTS, buttonDefs} from './data.jsx'

var update = require('react-addons-update');
var logo = require('./img/cdquizlogo.gif');

export const NEW_RESULTS_COUNT = 10;
export const ALL_TIME_RESULTS_COUNT = 10;


var dictionary = {};

// translation function
export function t(str) {
  if (dictionary.hasOwnProperty(str)) {
    return dictionary[str];
  }
  // default to hard-coded English
  return str;
}

function setDictionary(dict) {
  dictionary = dict;
}

export class Quiz extends React.Component {
  constructor(props) {
    var lang;
    super(props);
    // defaults to 'en' of none saved
    // TODO: consider allowing language as query parameter
    lang= loadLanguage();
    this.state = {
      questions: {},
      currentQuestionIdx: 0,
      answered: 0,
      score: 0,
      start: 0,
      elapsed: 1,
      quizRunning: false,
      displayingResult: false,
      type: SYMBOLS_TO_TEXT,
      results: [],
      name: loadName(),
      allTimeResults: loadAllTimeResults(),
      language: lang
    };
  }

  componentDidMount() {
    // timer runs continuously: count ticks when quiz is running
    this.timer = setInterval(this.onTick, 1000);
  }

  componentWillUnmount() {
   clearInterval(this.timer);
  }

  onTick = () => {
    if (this.state.quizRunning) {
      this.setState({elapsed: new Date() - this.state.start});
    }
  }

  onResultWindowClose = () => {
    this.setState({
      displayingResult: false
    });
  }

  onSelectLanguage = (lang) => {
    var self;
    // no file for English: empty array defaults to hard-coded text
    if (lang === 'en') {
      setDictionary({});
      saveLanguage('en');
      this.setState({
        language: 'en'
      });
      return;
    }
    // load requested language file
    self = this;
    $.ajax({
      url: 'app/lang/' + lang + '.json'
    })
    .done(function(lang) {
      setDictionary(lang);
      saveLanguage(lang.abbrev);
      self.setState({
        language: lang.abbrev
      });
    })
    .fail(function() {
      // fall back to English
      setDictionary({});
      saveLanguage('en');
      this.setState({
        language: 'en'
      });
    });
  }

  onSetName = (name) => {
    saveName(name);
    this.setState({
      name: name
    });
  }

  onSelectQuizType = (value) => {
    if (!this.state.quizRunning) {
      this.setState({
        type: value
      });
    }
  }

  onStartNewQuiz = (questions) => {
    if (questions.length > 0) {
      this.setState({
        questions: questions,
        currentQuestionIdx: 0,
        quizRunning: true,
        start: new Date().getTime(),
        elapsed: 0,
        answered: 0,
        score: 0
      });
    }
  }

  onMatchFinished = (validFinish, score, attempts) => {
    var newResults;
    if (validFinish) {
      newResults = this.addNewResult({
        type: this.getTypeText(this.state.type),
        name: this.state.name,
        score: score,
        from: attempts,
        percent: (score * 100/attempts).toFixed(1),
        time: parseInt((this.state.elapsed/1000), 10)
      }),
      this.setState({
        results: newResults.new,
        allTimeResults: newResults.allTime,
        quizRunning: false,
        displayingResult: true,
        score: score,
        answered: attempts
      });
    } else {
      this.setState({
        quizRunning: false
      });
    }
  }

  onCheckAnswer = (answer) => {
    var idx, score, gotIt, q, answered, newResults;
    if (!this.state.quizRunning) {
      return;
    }
    idx = this.state.currentQuestionIdx;
    score = this.state.score;
    gotIt = false;
    if (answer === this.state.questions[idx].question.desc) {
      score = score + 1,
      gotIt = true;
    }
    // http://stackoverflow.com/questions/30899454/dynamic-key-in-immutability-update-helper-for-array
    q = this.state.questions[idx];
    q.gotIt = gotIt;
    answered = this.state.answered + 1
    this.setState({
      questions: update(this.state.questions, {[idx]: {$set: q}}),
      answered: answered,
      score: score
    })
    if ((this.state.currentQuestionIdx + 1) === this.state.questions.length) {
      newResults = this.addNewResult({
        type: this.getTypeText(this.state.type),
        name: this.state.name,
        score: score,
        from: answered,
        percent: (score * 100/answered).toFixed(1),
        time: parseInt((this.state.elapsed/1000), 10)
      });
      this.setState({
        results: newResults.new,
        allTimeResults: newResults.allTime,
        quizRunning: false,
        displayingResult: true
      });
    } else {
      this.setState({currentQuestionIdx: this.state.currentQuestionIdx + 1});
    }
  }

  adjustResultArray(array, result, length) {
    var newResults;
    newResults = _.chain(array)
      // add new result to array
      .push(result)
      // sort by score DESC percent DESC time ASC
      .sortBy('time')
      .reverse()
      .sortBy(function(r) {return parseFloat(r.percent);})
      .sortBy('score')
      .reverse()
      // truncate
      .first(length)
      .value();
    return newResults;
  }

  addNewResult(result) {
    var newResults, newAllTimeResults;
    newResults = this.adjustResultArray(
      this.state.results,
      result,
      NEW_RESULTS_COUNT
    )
    newAllTimeResults = this.adjustResultArray(
      this.state.allTimeResults,
      result,
      ALL_TIME_RESULTS_COUNT
    );
    saveAllTimeResults(newAllTimeResults);
    return({
      new: newResults,
      allTime: newAllTimeResults
    });
  }

  getTypeText(type) {
    return _.chain(buttonDefs)
      .where({value: type})
      .pluck('text')
      .value();
  }

  saveResult(results) {
    this.setState({
      results: results
    });
  }

  renderBody() {
    if (this.state.type === VIEW_RESULTS) {
      return(
        <Results
          results={this.state.results}
          allTimeResults={this.state.allTimeResults}
        />
      );
    }
    if (!this.state.quizRunning  && !this.state.displayingResult) {
      return(
        <StartPage
          onStart={this.onStartNewQuiz}
          onSetName={this.onSetName}
          onSelectLanguage={this.onSelectLanguage}
          language={this.state.language}
          type={this.state.type}
          name={this.state.name}
        />
      );
    } else {
      return(
        <QuestionPage
          idx={this.state.currentQuestionIdx}
          type={this.state.type}
          questions={this.state.questions}
          score={this.state.score}
          answered={this.state.answered}
          elapsed={parseInt((this.state.elapsed/1000), 10)}
          onCheckAnswer={this.state.type === MATCH_ITEMS ?
            this.onMatchFinished
            :
            this.onCheckAnswer
          }
        />
      );
    }
  }

  render() {
    var message, body;

    message = t('You scored #1 out #2 in #3 seconds');
    message = message.replace(/\#1/, this.state.score);
    message = message.replace(/\#2/, this.state.answered);
    message = message.replace(/\#3/, parseInt((this.state.elapsed/1000), 10));

    body = this.renderBody();

    return (
      <div>
        <div className='header'>
          <div className='container'>
            <img src={logo}></img>
            <span className='title'>
              {'Maprunner ' + t('IOF Control Description Quiz')}
            </span>
          </div>
        </div>
        <div className='menu-bar'>
          <MenuBar
            active={this.state.type}
            onSelect={this.onSelectQuizType}
          />
        </div>
        <div className='container'>
          {body}
          {this.state.displayingResult ?
            <ResultMessage
              onClose={this.onResultWindowClose}
              questions={this.state.questions}
              type={this.state.type}
              name={this.state.name}
            >
              {message}
            </ResultMessage>
            :
            null
          }
        </div>
      </div>
    );
  }
}
