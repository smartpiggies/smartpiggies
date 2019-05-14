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

class Approvals extends Component {
  constructor(props, context) {
    super(props)

    this.contracts = context.drizzle.contracts

    this.handleTextMenuChange = this.handleTextMenuChange.bind(this)
    this.handleButton = this.handleButton.bind(this)
    this.handleOracleButton = this.handleOracleButton.bind(this)

    this.state = {
      addresses: [],
      accountAddress: '0x0000000000000000000000000000000000000000',
      tokenAddress: '0x0000000000000000000000000000000000000000',
      resolverAddress: '0x0000000000000000000000000000000000000000',
      approveAmount: '',
      currencies: [],
      resolvers: [],
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
    if (this.props.drizzleStatus) {
      if (this.props.store.getState().web3.networkId === 3) {
        this.state.resolvers.push({value: '0x749b61357Cf4BbeC0fc876cD87eF52e80D29E7D8',label: 'IEX SPY'})
        this.state.resolvers.push({value: '0xb03f9dc90997b2b2f8bfc97cd546ca05628b196f',label: 'Resolve 27000'})
        this.state.resolvers.push({value: '0x25e196efecc3b52e6e64ee331ce02704e6eebf95',label: 'CoinCap ETHUSD'})
        this.state.resolvers.push({value: '0x5ee7fe3726edce3ed3aea86f3a22ff6d28c54ece',label: 'CoinCap BTCUSD'})
        this.state.resolvers.push({value: '0xa4b09d1794dd1996b29a8b84f80e739df9810c67',label: 'OpenWeather NYC TEMP'})
      }
      if (this.props.store.getState().web3.networkId === 4) {
        this.state.resolvers.push({value: '0x6819727F25AB306aE48878387bB0F4C1374Ea9Ff',label: 'IEX SPY'})
        this.state.resolvers.push({value: '0xccd85a8e2918ddc29f5498c5a05412866c3cfc20',label: 'Resolve 27000'})
        this.state.resolvers.push({value: '0xa140ff02a68cb92c53da2145e6bed72db31e8380',label: 'CoinCap ETHUSD'})
        this.state.resolvers.push({value: '0x0847eeed35abba30ad07f938e809a48afeb20e97',label: 'CoinCap BTCUSD'})
        this.state.resolvers.push({value: '0xf409e8711afbc473abc7046e8750786687c8abdd',label: 'OpenWeather NYC TEMP'})
      }
      if (this.props.store.getState().web3.networkId === 5) {
        this.state.resolvers.push({value: '0x7af0036610ebfd178b6bcfc5789ec1493d88f927',label: 'Resolve 29000'})
        this.state.resolvers.push({value: '0x16C986F144D57f1e7a313F50d82cd72668803b2E',label: 'Resolve 15000'})
      }
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.drizzleStatus !== prevProps.drizzleStatus) {
      if (this.props.store.getState().web3.networkId === 3) {
        this.state.resolvers.push({value: '0x749b61357Cf4BbeC0fc876cD87eF52e80D29E7D8',label: 'IEX SPY'})
        this.state.resolvers.push({value: '0xb03f9dc90997b2b2f8bfc97cd546ca05628b196f',label: 'Resolve 27000'})
        this.state.resolvers.push({value: '0x25e196efecc3b52e6e64ee331ce02704e6eebf95',label: 'CoinCap ETHUSD'})
        this.state.resolvers.push({value: '0x5ee7fe3726edce3ed3aea86f3a22ff6d28c54ece',label: 'CoinCap BTCUSD'})
        this.state.resolvers.push({value: '0xa4b09d1794dd1996b29a8b84f80e739df9810c67',label: 'OpenWeather NYC TEMP'})
      }
      if (this.props.store.getState().web3.networkId === 4) {
        this.state.resolvers.push({value: '0x6819727F25AB306aE48878387bB0F4C1374Ea9Ff',label: 'IEX SPY'})
        this.state.resolvers.push({value: '0xccd85a8e2918ddc29f5498c5a05412866c3cfc20',label: 'Resolve 27000'})
        this.state.resolvers.push({value: '0xa140ff02a68cb92c53da2145e6bed72db31e8380',label: 'CoinCap ETHUSD'})
        this.state.resolvers.push({value: '0x0847eeed35abba30ad07f938e809a48afeb20e97',label: 'CoinCap BTCUSD'})
        this.state.resolvers.push({value: '0xf409e8711afbc473abc7046e8750786687c8abdd',label: 'OpenWeather NYC TEMP'})
      }
      if (this.props.store.getState().web3.networkId === 5) {
        this.state.resolvers.push({value: '0x7af0036610ebfd178b6bcfc5789ec1493d88f927',label: 'Resolve 29000'})
        this.state.resolvers.push({value: '0x16C986F144D57f1e7a313F50d82cd72668803b2E',label: 'Resolve 15000'})
      }
    }
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

  handleButton() {
    if (this.state.tokenAddress === this.contracts.StableToken.address) {
      this.contracts.StableToken.methods.approve.cacheSend(
        this.contracts.SmartPiggies.address,
        this.state.approveAmount,
        {from: this.state.accountAddress, gas: 1000000, gasPrice: 1100000000})
    } else if (this.state.tokenAddress === this.contracts.StableTokenFaucet.address) {
          this.contracts.StableTokenFaucet.methods.approve.cacheSend(
            this.contracts.SmartPiggies.address,
            this.state.approveAmount,
            {from: this.state.accountAddress, gas: 1000000, gasPrice: 1100000000})
        } else {
          console.log("Error Approving Collateral.")
        }
  }

  handleOracleButton() {
    this.contracts.TestnetLINK.methods.approve.cacheSend(
      this.state.resolverAddress,
      this.state.approveAmount,
      {from: this.state.accountAddress, gas: 1000000, gasPrice: 1100000000})
  }

  render() {
    return (
      <div className="App">
        <Paper>
            <Typography variant="h5" style={{padding: "10px"}}>Approve Stable Token Transfer</Typography>
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
                        value={this.state.approveAmount}
                        onChange={this.handleTextMenuChange('approveAmount')}
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
                    <ListItemText>Approval Amount:</ListItemText>
                    <TextField
                        id="approveAmount"
                        label="Amount"
                        value={this.state.approveAmount}
                        onChange={this.handleTextMenuChange('approveAmount')}
                        margin="normal"
                        variant="filled"
                    />
                </ListItem>
            </List>
            <Button type="Button" variant="contained" color="primary" size="large" onClick={this.handleButton} style={{marginBottom: "15px"}}>Approve</Button>
          </Paper>
          <br></br>
          <Typography variant="h6" align="left"><a href='https://docs.chain.link/docs/acquire-link' target='new'>To get test LINK click here</a></Typography>
          <Paper>
            <Typography variant="h5" style={{padding: "10px"}}>Approve Oracle Fee Transfer</Typography>
            <Divider />
            <List>
                <ListItem>
                    <ListItemText>Oracle Fee Address:</ListItemText>
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
                        value={this.state.approveAmount}
                        onChange={this.handleTextMenuChange('approveAmount')}
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
                    <ListItemText>Approve Amount:</ListItemText>
                    <TextField
                        id="approveAmount"
                        label="Amount"
                        value={this.state.approveAmount}
                        onChange={this.handleTextMenuChange('approveAmount')}
                        margin="normal"
                        variant="filled"
                    />
                </ListItem>
                <ListItem>
                    <ListItemText>Resolvers:</ListItemText>
                    <TextField
                        id="resolvers"
                        select
                        label="resolvers"
                        value={this.state.resolverAddress}
                        onChange={this.handleTextMenuChange('resolverAddress')}
                        helperText="select a resolver"
                        margin="normal"
                        variant="filled"
                    >
                        {this.state.resolvers.map(option => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </TextField>
                </ListItem>
                <ListItem>
                    <ListItemText>Approve Amount:</ListItemText>
                    <TextField
                        id="approveAmount"
                        label="Amount"
                        value={this.state.approveAmount}
                        onChange={this.handleTextMenuChange('approveAmount')}
                        margin="normal"
                        variant="filled"
                    />
                </ListItem>
            </List>
            <Button type="Button" variant="contained" color="primary" size="large" onClick={this.handleOracleButton} style={{marginBottom: "15px"}}>Approve</Button>
        </Paper>
      </div>
    )
  }
}

Approvals.contextTypes = {
  drizzle: PropTypes.object
}

// May still need this even with data function to refresh component on updates for this contract.
const mapStateToProps = state => {
  return {
    accounts: state.accounts,
    StableToken: state.contracts.StableToken,
    StableTokenFaucet: state.contracts.StableTokenFaucet,
    TestnetLINK: state.contracts.TestnetLINK,
    SmartPiggies: state.contracts.SmartPiggies,
    drizzleStatus: state.drizzleStatus,
    transactionStack: state.transactionStack,
    transactions: state.transactions
  }
}

export default drizzleConnect(Approvals, mapStateToProps)
