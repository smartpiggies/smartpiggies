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
import React, { Component } from 'react'
import { drizzleConnect } from 'drizzle-react'
import PropTypes from 'prop-types'
//import web3 from 'web3'


import Button from '@material-ui/core/Button'
//import MenuItem from '@material-ui/core/MenuItem'
import TextField from '@material-ui/core/TextField'
import Paper from '@material-ui/core/Paper'
import Typography from '@material-ui/core/Typography'
import Divider from '@material-ui/core/Divider'

import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';

//import PiggyDetail from '../PiggyDetail'
import BrowsePiggy from '../BrowsePiggy'
//const BN = web3.utils.BN

class SatisfyAuction extends Component {
  constructor(props, context) {
    super(props)

    this.contracts = context.drizzle.contracts

    this.handleTextMenuChange = this.handleTextMenuChange.bind(this)
    this.handleBrowseButton = this.handleBrowseButton.bind(this)
    this.handleSatisfyButton = this.handleSatisfyButton.bind(this)

    this.state = {
      accountAddress: '0x0000000000000000000000000000000000000000',
      piggyId: '0',
      showDetails: false,
      details: [],
      auctionDetails: [],
      onAuction: false,
      startBlock: 0,
      expiryBlock: 0,
      startPrice: 0,
      reservePrice: 0,
      timeStep: 0,
      priceStep: 0,
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

  handleBrowseButton() {

    this.contracts.SmartPiggies.methods.getDetails(
      this.state.piggyId)
    .call({from: this.state.accountAddress})
    .then(result => {
      this.setState({
        showDetails: true,
        details: result
      })
    })

    this.contracts.SmartPiggies.methods.getAuctionDetails(
      this.state.piggyId)
    .call({from: this.state.accountAddress})
    .then(result => {
      if (result.length === 8) {
        if (result.auctionActive) {
          this.setState({
            onAuction: true,
            auctionDetails: result,
          })
        }
      }
    })
  }

  handleSatisfyButton() {
    if (this.state.accountAddress !== '0x0000000000000000000000000000000000000000') {
      this.contracts.SmartPiggies.methods.satisfyAuction.cacheSend(
        this.state.piggyId,
        {from: this.state.accountAddress, gas: 1000000, gasPrice: 1100000000})
    }
  }

  render() {
    //console.log(this.state.details)
    return (
      <div className="App">
      <Paper>
        <Typography variant="h5" style={{padding: "10px"}}>Satisfy an Auction for a SmartPiggies Token</Typography>
        <Divider />
        <Table>
          <TableBody>
            <TableRow>
              <TableCell align="left">
                  <Typography variant="h6">Token ID to Browse: </Typography>
              </TableCell>
              <TableCell align="right">
                <TextField
                      id="piggyId"
                      label="piggyId"
                      value={this.state.piggyId}
                      onChange={this.handleTextMenuChange('piggyId')}
                      margin="normal"
                      variant="filled"
                    />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell variant="footer">
                  <Button type="Button" variant="contained" color="default" style={{marginBottom: "15px"}}onClick={this.handleBrowseButton}>Browse</Button>
                </TableCell>
              </TableRow>
          </TableBody>
        </Table>

        {this.state.showDetails &&
          <div>
          <Typography variant="h5" style={{textAlign: "left", padding: "10px" }}>Details for SmartPiggies ID: {this.state.piggyId}</Typography>

          <BrowsePiggy details={this.state.details} auctionDetails={this.state.auctionDetails} />

          </div>

        }<br></br>
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
    TestnetLINK: state.contracts.TestnetLINK,
    drizzleStatus: state.drizzleStatus,
    transactionStack: state.transactionStack,
    transactions: state.transactions
  }
}

export default drizzleConnect(SatisfyAuction, mapStateToProps)
