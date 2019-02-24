/**
This application is for use with SmartPiggies.

SmartPiggies is an open source standard for
a free peer to peer global derivatives market.
Copyright (C) <2019>  <Arief, Algya, Lee>

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
import React, { Component } from 'react'
import { drizzleConnect } from 'drizzle-react'
import PropTypes from 'prop-types'
import web3 from 'web3'


import Button from '@material-ui/core/Button'
//import MenuItem from '@material-ui/core/MenuItem'
import TextField from '@material-ui/core/TextField'
import Paper from '@material-ui/core/Paper'
import Typography from '@material-ui/core/Typography'
import Divider from '@material-ui/core/Divider'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import ListItemText from '@material-ui/core/ListItemText'

//import GetStats from '../../Layout/GetStats'
//import AccountAddress from '../Displays/AccountAddress'
//import TokenBalance from '../Displays/TokenBalance'

import PiggyDetail from "../PiggyDetail";

const BN = web3.utils.BN

class SatisfyAuction extends Component {
  constructor(props, context) {
    super(props)

    this.contracts = context.drizzle.contracts

    this.handleTextMenuChange = this.handleTextMenuChange.bind(this)
    this.handleSatisfyButton = this.handleSatisfyButton.bind(this)

    this.state = {
      accountAddress: '0x0000000000000000000000000000000000000000',
      piggyId: '0',
      startPrice: '',
      reservePrice: '',
      auctionLength: '',
      timeStep: '',
      priceStep: '',
    }
  }

  componentDidMount() {
    this.setState({
      accountAddress: this.props.accounts[0],
    })
  }

  handleTextMenuChange = name => event => {
    this.setState({ [name]: event.target.value })
  }

  handleSatisfyButton() {
    if (this.state.accountAddress !== '0x0000000000000000000000000000000000000000') {
      console.log("id: ", this.state.piggyId)
      console.log("account: ", this.state.accountAddress)
      this.contracts.SmartPiggies.methods.satisfyAuction(this.state.piggyId)
      .send(
        {from: this.state.accountAddress, gas: 1000000, gasPrice: 1100000000})
        .then(result => {
          console.log(result)
        })
    }

  }

  render() {

    return (
      <div className="App">
      <Paper>
        <Typography variant="h5" style={{marginBottom: "15px"}}>Satisfy an Auction for a SmartPiggies Token</Typography>
        <Divider />
        <List>
          <ListItem>
            <ListItemText>Token ID to Browse:</ListItemText>
            <TextField
                  id="piggyId"
                  label="piggyId"
                  value={this.state.piggyId}
                  onChange={this.handleTextMenuChange('piggyId')}
                  margin="normal"
                  variant="filled"
                />
          </ListItem>
          <ListItem>
            <ListItemText>Token Info:</ListItemText>
            <PiggyDetail piggies={this.props.piggyDetailMap} />
          </ListItem>
        </List>
        <Button type="Button" variant="contained" color="primary" style={{marginBottom: "15px"}}onClick={this.handleSatisfyButton}>Satisfy</Button>
      </Paper>
      </div>
    )
  }
}

SatisfyAuction.contextTypes = {
  drizzle: PropTypes.object
}

// May still need this even with data function to refresh component on updates for this contract.
const mapStateToProps = state => {
  return {
    accounts: state.accounts,
    SmartPiggies: state.contracts.SmartPiggies,
    StableToken: state.contracts.StableToken,
    RopstenLINK: state.contracts.RopstenLINK,
    drizzleStatus: state.drizzleStatus,
    transactionStack: state.transactionStack,
    transactions: state.transactions
  }
}

export default drizzleConnect(SatisfyAuction, mapStateToProps)
