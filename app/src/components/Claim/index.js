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

//import TokenBalance from '../Displays/TokenBalance'
//import ERC20Balance from '../ERC20Balance'

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

class Claim extends Component {
  constructor(props, context) {
    super(props)

    this.contracts = context.drizzle.contracts

    this.handleInputChange = this.handleInputChange.bind(this)
    this.handleTextMenuChange = this.handleTextMenuChange.bind(this)
    this.handleTextInputChange = this.handleTextInputChange.bind(this)
    this.handleCheckedInputChange = this.handleCheckedInputChange.bind(this)
    this.handleButton = this.handleButton.bind(this)

    this.state = {
      addresses: [],
      accountAddress: '0x0000000000000000000000000000000000000000',
      tokenAddress: '0x0000000000000000000000000000000000000000',
      claimAmount: '',
      currencies: [
        {
          value: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359',
          label: 'Dai',
        },
      ],
    }
  }

  componentDidMount() {
    this.state.currencies.push({value: this.contracts.StableToken.address, label: 'STBLE'})
    this.state.currencies.push({value: this.contracts.StableTokenFaucet.address, label: 'STBLE-F'})
    this.state.currencies.push({value: this.contracts.TestnetLINK.address, label: 'LINK'})
    this.setState({
      accountAddress: this.props.accounts[0],
      tokenAddress: this.contracts.StableToken.address
    })
  }

  handleTextInputChange(event) {
        this.setState({ [event.target.name]: event.target.value })
  }

  handleTextMenuChange = name => event => {
    this.setState({ [name]: event.target.value })
  }

  handleCheckedInputChange = name => event => {
    this.setState({ [name]: event.target.checked })
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

  handleButton() {
    this.contracts.SmartPiggies.methods.claimPayout.cacheSend(
      this.state.tokenAddress,
      this.state.claimAmount,
      {from: this.state.accountAddress, gas: 1000000, gasPrice: 1100000000})
  }

  render() {
    //console.log(addresses)
    return (
      <div className="App">
        <Paper>
            <Typography variant="h5" style={{padding: "10px"}}>Claim a Payout</Typography>
            <Divider />
            <List>
                <ListItem>
                    <ListItemText>Token Address:</ListItemText>
                    <TextField
                        id="tokenAddress"
                        select
                        label="TokenAddress"
                        value={this.state.tokenAddress}
                        onChange={this.handleTextMenuChange('tokenAddress')}
                        helperText="select a token contract"
                        margin="normal"
                        variant="filled"
                    >
                        {this.state.currencies.map(option => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </TextField>
                </ListItem>
                <ListItem>
                    <ListItemText>Units Denomination:</ListItemText>
                    <TextField
                        id="denomination"
                        select
                        label="denomination"
                        value={this.state.claimAmount}
                        onChange={this.handleTextMenuChange('claimAmount')}
                        helperText="select a denomination"
                        margin="normal"
                        variant="filled"
                    >
                        {amounts.map(option => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </TextField>
                </ListItem>
                <ListItem>
                    <ListItemText>Withdrawal Amount:</ListItemText>
                    <TextField
                        id="claimAmount"
                        label="Amount"
                        value={this.state.claimAmount}
                        onChange={this.handleTextMenuChange('claimAmount')}
                        margin="normal"
                        variant="filled"
                    />
                </ListItem>
            </List>
            <Button type="Button" variant="contained" color="primary" size="large" onClick={this.handleButton} style={{marginBottom: "15px"}}>Claim Payout</Button>
        </Paper>
      </div>
    )
  }
}

Claim.contextTypes = {
  drizzle: PropTypes.object
}

// May still need this even with data function to refresh component on updates for this contract.
const mapStateToProps = state => {
  return {
    accounts: state.accounts,
    StableToken: state.contracts.StableToken,
    StableTokenFacuet: state.contracts.StableTokenFacuet,
    TestnetLINK: state.contracts.TestnetLINK,
    SmartPiggies: state.contracts.SmartPiggies,
    drizzleStatus: state.drizzleStatus,
    transactionStack: state.transactionStack,
    transactions: state.transactions
  }
}

export default drizzleConnect(Claim, mapStateToProps)
