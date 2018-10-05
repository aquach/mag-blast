'use strict';

const _ = require('lodash');
const $ = require('jquery');
const React = require('react');
const Draggable = require('react-draggable');
const ReactDOM = require('react-dom');
const Swarm = require('swarm');
const MagBlastData = require('../mag-blast-data');

const update = require('react-addons-update');

const swarmHost = new Swarm.Host(Math.floor(Math.random() * 2500).toString());
swarmHost.connect(`ws://${window.location.host.split(':')[0]}:8080/`);

const dataModel = new MagBlastData('GlobalGame');

const Promise = require('es6-promise').Promise;

const dreadNoughts = [
  [ 1, 9 ],
  [ 2, 10 ],
  [ 2, 11 ],
  [ 1, 11 ]
];

const carriers = [
  [ 2, 7 ],
  [ 3, 8 ],
  [ 2, 9 ]
];

const cruisers = [
  [ 1, 5 ],
  [ 1, 6 ],
  [ 1, 7 ]
];

const destroyers = [
  [ 9, 4 ],
  [ 1, 5 ]
];

const scouts = [
  [ 1, 1 ],
  [ 1, 2 ],
  [ 8, 3 ],
  [ 2, 4 ]
];

const gunships = [
  [ 1, 4, 2 ],
  [ 1, 5, 1 ],
  [ 1, 6, 0 ]
];

const minesweepers = [
  [ 3, 4 ]
];

const shipCards = [];

console.log(dreadNoughts);
dreadNoughts.forEach(d => _.each(_.range(d[0]), () => shipCards.push({ type: 'dreadnought', turrets: 'BM', move: 0, hp: d[1] })));
carriers.forEach(d => _.each(_.range(d[0]), () => shipCards.push({ type: 'carrier', turrets: 'L', move: 1, hp: d[1] })));
cruisers.forEach(d => _.each(_.range(d[0]), () => shipCards.push({ type: 'cruiser', turrets: 'B', move: 1, hp: d[1] })));
destroyers.forEach(d => _.each(_.range(d[0]), () => shipCards.push({ type: 'destroyer', turrets: 'LB', move: 1, hp: d[1] })));
scouts.forEach(d => _.each(_.range(d[0]), () => shipCards.push({ type: 'scout', turrets: 'L', move: 1, hp: d[1] })));
gunships.forEach(d => _.each(_.range(d[0]), () => shipCards.push({ type: 'gunship', turrets: 'LBM', move: 1, hp: d[1] })));
minesweepers.forEach(d => _.each(_.range(d[0]), () => shipCards.push({ type: 'minesweeper', turrets: 'L', move: 1, hp: d[1] })));

const actionCards = [];

_.times(18, () => actionCards.push({ type: 'laser' }));
_.times(23, () => actionCards.push({ type: 'beam' }));
_.times(11, () => actionCards.push({ type: 'mag' }));
_.times(10, () => actionCards.push({ type: 'fighter' }));
_.times(3, () => actionCards.push({ type: 'bomber' }));
_.times(5, () => actionCards.push({ type: 'reinforcements' }));
_.times(2, () => actionCards.push({ type: 'asteroids' }));
_.times(3, () => actionCards.push({ type: 'minefields' }));
_.times(1, () => actionCards.push({ type: 'strat-al' }));
_.times(2, () => actionCards.push({ type: 'evasive-action' }));
_.times(2, () => actionCards.push({ type: 'temporal-flux' }));
_.times(8, () => actionCards.push({ type: 'direct-hit' }));
_.times(2, () => actionCards.push({ type: 'bridge-hit' }));
_.times(2, () => actionCards.push({ type: 'catastrophic-damage' }));
_.times(2, () => actionCards.push({ type: 'boarding-party' }));
_.times(4, () => actionCards.push({ type: 'space-dock' }));

const commanderCards = [
  { type: 'bzzrt' },
  { type: 'the-glorp' },
  { type: 'alpha-mazons' },
  { type: 'brotherhood-of-peace' },
  { type: 'overseers-of-kalgon' }
];

actionCards.forEach(c => c.id = _.uniqueId());
shipCards.forEach(c => c.id = _.uniqueId());
commanderCards.forEach(c => c.id = _.uniqueId());

const MagBlastRoot = React.createClass({
  getInitialState() {
    const playerID = window.localStorage.getItem('playerID') || Math.random().toString();
    window.localStorage.setItem('playerID', playerID);

    return {
      playerID: playerID,
      data: {
        actionDeck: _.shuffle(actionCards),
        shipDeck: _.shuffle(shipCards),
        commanderDeck: _.shuffle(commanderCards),
        discardPile: [],
        board: [],
        players: {}
      }
    };
  },

  _updatePromise: Promise.resolve(),

  setData(f) {
    this._updatePromise = this._updatePromise.then(() => {
      return new Promise(resolve => {
        this.setState({ data: f(this.state.data) }, function() { console.log(this.state.data); resolve(); });
      });
    }).catch(e => console.error(e));
  },

  componentDidMount() {
    dataModel.on('init', () => {
      console.log("Loaded data", dataModel.data);
      this.setState({ data: dataModel.data });

      if (!this.me())
        this.setData(d => update(d, { players: { [this.state.playerID]: { $set: { hand: [] } } } }));
    });

    dataModel.on((spec, val, source) => {
      if (spec.op() === 'set') {
        console.log("Setting data from remote.");
        this.setState({ data: dataModel.data });
      }
    });
  },

  shouldComponentUpdate(nextProps, nextState) {
    return !_.isEqual(this.props, nextProps) || !_.isEqual(this.state, nextState);
  },

  me() {
    return this.state.data && this.state.data.players && this.state.data.players[this.state.playerID];
  },

  componentDidUpdate() {
    dataModel.set({ data: this.state.data });
  },

  _drawActionCard() {
    this.setData(d => {
      const card = this.state.data.actionDeck[0];
      const a = update(d, { actionDeck: { $splice: [[ 0, 1 ]] } });
      const b = update(a, { players: { [this.state.playerID]: { hand : { $push : [card] } } } });
      return b;
    });
  },

  _drawShipCard() {
    this.setData(d => {
      const card = this.state.data.shipDeck[0];
      const a = update(d, { shipDeck: { $splice: [[ 0, 1 ]] } });
      const b = update(a, { players: { [this.state.playerID]: { hand : { $push : [card] } } } });
      return b;
    });
  },

  _drawCommanderCard() {
    this.setData(d => {
      const card = this.state.data.commanderDeck[0];
      const a = update(d, { shipDeck: { $splice: [[ 0, 1 ]] } });
      const b = update(a, { players: { [this.state.playerID]: { hand : { $push : [card] } } } });
      return b;
    });
  },

  _moveCardToDiscard() {
    this.setData(d => {
      const cardIndex = _.findIndex(this.state.data.board, c => c.id === this.state.selectedCardID);
      if (cardIndex === -1)
        return d;

      const card = this.state.data.board[cardIndex];
      const a = update(d, { board: { $splice : [[cardIndex, 1]] } } );
      const b = update(a, { discardPile: { $push: [card] }});

      return b;
    });
  },

  _flipCard() {
    this.setData(d => {
      const cardIndex = _.findIndex(this.state.data.board, c => c.id === this.state.selectedCardID);
      if (cardIndex === -1)
        return d;

      const card = this.state.data.board[cardIndex];
      const a = update(d, { board: { [cardIndex]: { flipped: { $set: !card.flipped } } } } );

      return a;
    });
  },

  _moveCardToBoard() {
    this.setData(d => {
      const cardIndex = _.findIndex(this.me().hand, c => c.id === this.state.selectedCardID);
      if (cardIndex === -1)
        return d;

      const card = this.me().hand[cardIndex];
      const a = update(d, { players: { [this.state.playerID]: { hand : { $splice : [[cardIndex, 1]] } } } });
      const b = update(a, { board: { $push: [card] }});

      return b;
    });
  },

  _moveCardToBoardFaceDown() {
    this.setData(d => {
      const cardIndex = _.findIndex(this.me().hand, c => c.id === this.state.selectedCardID);
      if (cardIndex === -1)
        return d;

      const card = this.me().hand[cardIndex];
      const flippedCard = update(card, { flipped: { $set: true } } );
      const a = update(d, { players: { [this.state.playerID]: { hand : { $splice : [[cardIndex, 1]] } } } });
      const b = update(a, { board: { $push: [flippedCard] }});

      return b;
    });
  },

  _selectCard(cardID) {
    this.setState({ selectedCardID: cardID });
  },

  _handleDragStop(cardID, event, ui) {
    this.setData(d => {
      const cardIndex = _.findIndex(this.state.data.board, c => c.id === cardID);
      if (cardIndex === -1)
        return d;

      console.log(ui.position);

      const card = this.state.data.board[cardIndex];
      const a = update(d, { board: { [cardIndex]: { top: { $set: ui.position.top }, left: { $set: ui.position.left } } } } );

      return a;
    });
  },

  render() {
    const renderCard = (isBoard, c) => {
      return (
        <Draggable key={c.id + c.left + c.top} bounds="parent" zIndex={100} start={{ x: c.left || 25, y: c.top || 25 }} grid={[25, 25]} onStop={this._handleDragStop.bind(null, c.id)} disabled={!isBoard}>
          <div key={c.id} onClick={this._selectCard.bind(null, c.id)} className={`card ${c.flipped ? 'flipped' : ''} ${this.state.selectedCardID === c.id ? 'selected': ''} ${isBoard ? 'onBoard' : ''}`} style={{ transform: `translate(${c.left}px, ${c.top}px)` }}>
            { c.move !== undefined ? (<div className="move">M: {c.move}</div>) : '' }
            { c.type !== undefined ? (<div className="type">{c.type}</div>) : '' }
            { c.turrets !== undefined ? (<div className="turrets">{c.turrets}</div>) : '' }
            { c.hp !== undefined ? (<div className="hp">HP: {c.hp}</div>) : '' }
          </div>
        </Draggable>
      );
    };

    return (
      <div>
        <button onClick={this._drawActionCard}>Draw Action Card</button>
        <button onClick={this._drawShipCard}>Draw Ship Card</button>
        <button onClick={this._drawCommanderCard}>Draw Commander Card</button>

        <button onClick={this._moveCardToDiscard}>Move to Discard</button>
        <button onClick={this._flipCard}>Flip</button>

        <button onClick={this._moveCardToBoard}>Move to Board</button>
        <button onClick={this._moveCardToBoardFaceDown}>Move to Board Face Down</button>

        <div className="board">
          {this.state.data.board.map(renderCard.bind(null, true))}
        </div>
        <div className="hand">
          {this.me() && this.me().hand.map(renderCard.bind(null, false))}
        </div>

      </div>
    );
  }
});

$(() => {
  const rootNode = document.getElementById('root');
  ReactDOM.render(<MagBlastRoot />, rootNode);
});
