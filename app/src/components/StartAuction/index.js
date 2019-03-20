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
import web3 from 'web3'


import Button from '@material-ui/core/Button'
import MenuItem from '@material-ui/core/MenuItem'
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
//import GetBlockNumber from '../GetBlockNumber'

const BN = web3.utils.BN

const amounts = [
  {
    value: '1000000000000000000',
    label: '1x10^18',
  },
  {
    value: '10000000000000000000',
    label: '10x10^18',
  },
  {
    value: '100000000000000000000',
    label: '100x10^18',
  },
]

class StartAuction extends Component {
  constructor(props, context) {
    super(props)

    this.contracts = context.drizzle.contracts

    this.handleTextMenuChange = this.handleTextMenuChange.bind(this)
    this.handleStartButton = this.handleStartButton.bind(this)

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
      piggyId: this.props.tokenId,
    })
  }

  handleTextMenuChange = name => event => {
    this.setState({ [name]: event.target.value })
  }

  handleInputChange(event) {
    if (event.target.value.match(/^[0-9]{1,40}$/)) {
      var amount = new BN(event.target.value)
      if (amount.gte(0)) {
        this.setState({ [event.target.name]: amount.toString() })
        //this.setTXParamValue(amount)
      } else {
        this.setState({ [event.target.name]: '' })
        //this.setTXParamValue(0)
      }
    } else {
        this.setState({ [event.target.name]: '' })
        //this.setTXParamValue(0)
      }
  }

  setTXParamValue(_value) {
    if (web3.utils.isBN(_value)) {
      this.setState({
        detail: _value.toString()
      })
    } else {
      this.setState({
        detail: ''
      })
    }
  }

  handleStartButton() {
    this.contracts.SmartPiggies.methods.startAuction.cacheSend(
      this.state.piggyId,
      this.state.startPrice,
      this.state.reservePrice,
      this.state.auctionLength,
      this.state.timeStep,
      this.state.priceStep,
      {from: this.state.accountAddress, gas: 1000000, gasPrice: 1100000000})
  }

  render() {

    return (
      <div className="App">
        <Paper>
          <Typography variant="h5" style={{ padding: "10px" }}>Auction SmartPiggies Token ID: {this.props.tokenId}</Typography>
          <Divider />
          <List style={{width: 700}}>
            <ListItem>
              <ListItemText>Units Denomination:</ListItemText>
              <TextField
                id="denomination"
                select
                label="denomination"
                value={this.state.startPrice}
                onChange={this.handleTextMenuChange('startPrice')}
                helperText="select a denomination"
                margin="normal"
                variant="filled"
              >
                {amounts.map(option => (
                  <MenuItem key={option.label} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </ListItem>
            <ListItem>
              <ListItemText>Start Amount:</ListItemText>
              <TextField
                id="startPrice"
                label="Starting Price"
                value={this.state.startPrice}
                onChange={this.handleTextMenuChange('startPrice')}
                margin="normal"
                variant="filled"
              />
            </ListItem>
            <ListItem>
              <ListItemText>Reserve Amount:</ListItemText>
              <TextField
                id="reservePrice"
                label="Reserve"
                value={this.state.reservePrice}
                onChange={this.handleTextMenuChange('reservePrice')}
                margin="normal"
                variant="filled"
              />
            </ListItem>
            <ListItem>
              <ListItemText>Auction Duration:</ListItemText>
              <TextField
                id="auctionLength"
                label="Blocks"
                value={this.state.auctionLength}
                onChange={this.handleTextMenuChange('auctionLength')}
                margin="normal"
                variant="filled"
              />
            </ListItem>
            <ListItem>
              <ListItemText>Time Step:</ListItemText>
              <TextField
                id="timeStep"
                label="Blocks"
                value={this.state.timeStep}
                onChange={this.handleTextMenuChange('timeStep')}
                margin="normal"
                variant="filled"
              />
            </ListItem>
            <ListItem>
              <ListItemText>Price Step:</ListItemText>
              <TextField
                id="priceStep"
                label="Interval Value"
                value={this.state.priceStep}
                onChange={this.handleTextMenuChange('priceStep')}
                margin="normal"
                variant="filled"
              />
            </ListItem>
          </List>
          <Button type="Button" variant="contained" color="primary" style={{ marginBottom: "15px" }} onClick={this.handleStartButton}>Start Auction</Button>
        </Paper>
      </div>
    )
  }
}

StartAuction.contextTypes = {
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

export default drizzleConnect(StartAuction, mapStateToProps)
