/**
This application is for use with SmartPiggies.

SmartPiggies is an open source standard for
a free peer to peer global derivatives market.

Copyright (C) 2019, Arief, Algya, Lee

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
**/
import React, { Component } from "react"
import { drizzleConnect } from "drizzle-react"

import PropTypes from 'prop-types'

/* import components */
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';

class ListPiggies extends Component {
  constructor(props, context) {
    super(props)

    this.handleButton = this.handleButton.bind(this)
    this.state = {
      piggy: ''
    }
  }

  handleButton(event) {
    // this.setState({
    //   selectedPiggy: this.props.piggyId,
    // })
    // super.setState({
    //   selectedPiggy: this.props.piggyId,
    // })
    console.log(this.props.piggyId)
  }

  render() {

    return (
      <div>
      <ListItem button key={this.props.key} piggyId={this.props.piggyId} onClick={this.handleButton}>
        <ListItemText>
          {this.props.piggyIndex}
        </ListItemText>
          {this.props.piggyId}
      </ListItem>
      {/*
      {this.props.piggyList.map(item => (
        <ListItem button key={item.label} value={item.value} onClick={this.handleButton}>
          <ListItemText>
            {item.label}
          </ListItemText>
            {item.value}
        </ListItem>
      ))}
      */}
        </div>
    )
  }
}

ListPiggies.contextTypes = {
  drizzle: PropTypes.object
}

const mapStateToProps = state => {
  return {
    accounts: state.accounts,
    SmartPiggies: state.contracts.SmartPiggies,
    TableTokens: state.contracts.TableTokens,
    StableLink: state.contracts.StableLink,
    drizzleStatus: state.drizzleStatus,
  };
};

export default drizzleConnect(ListPiggies, mapStateToProps);
