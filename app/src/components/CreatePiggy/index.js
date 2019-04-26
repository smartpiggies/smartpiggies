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
import Checkbox from '@material-ui/core/Checkbox'
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

class CreatePiggy extends Component {
  constructor(props, context) {
    super(props)

    this.contracts = context.drizzle.contracts

    this.handleTextMenuChange = this.handleTextMenuChange.bind(this)
    this.handleCheckedInputChange = this.handleCheckedInputChange.bind(this)
    this.handleCreateButton = this.handleCreateButton.bind(this)

    this.state = {
      resolvers: [],
      currencies: [
        {
          value: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359',
          label: 'Dai',
        },
      ],
      accountAddress: '0x0000000000000000000000000000000000000000',
      collateralAddress: '0x0000000000000000000000000000000000000000',
      premiumAddress: '0x0000000000000000000000000000000000000000',
      oracleNowAddress: '0x0000000000000000000000000000000000000000',
      oracleAtExpiryAddress: '0x0000000000000000000000000000000000000000',
      collateralAmount: '',
      lotSizeAmount: '',
      strikePrice: '',
      blockExpiration: 0,
      checkedEuro: false,
      checkedPut: false,
      checkedRFP: false
    }
  }

  componentDidMount() {
    let addressArray = []
    //let oracleArray = this.state.resolvers
    let currencyArray = this.state.currencies
    currencyArray.push({value: this.contracts.StableToken.address, label: 'STBLE'})
    currencyArray.push({value: this.contracts.StableTokenFaucet.address, label: 'STBLE-F'})
    currencyArray.push({value: this.contracts.TestnetLINK.address, label: 'LINK'})
    //oracleArray.push({value: this.contracts.OracleResolver.address, label: 'OracleIEXSPY'})
    this.setState({
      accountAddress: this.props.accounts[0],
      addresses: addressArray,
      currencies: currencyArray
    })
    if (this.props.drizzleStatus) {
      if (this.props.networkId === '3') {
        this.state.resolvers.push({value: '0x749b61357Cf4BbeC0fc876cD87eF52e80D29E7D8',label: 'IEX SPY'})
        this.state.resolvers.push({value: '0xb03f9dc90997b2b2f8bfc97cd546ca05628b196f',label: 'Resolve 27000'})
        this.state.resolvers.push({value: '0x25e196efecc3b52e6e64ee331ce02704e6eebf95',label: 'CoinCap ETHUSD'})
        this.state.resolvers.push({value: '0x5ee7fe3726edce3ed3aea86f3a22ff6d28c54ece',label: 'CoinCap BTCUSD'})
        this.state.resolvers.push({value: '0xa4b09d1794dd1996b29a8b84f80e739df9810c67',label: 'OpenWeather NYC TEMP'})
      }
      if (this.props.networkId === '4') {
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
      if (this.props.networkId === '3') {
        this.state.resolvers.push({value: '0x749b61357Cf4BbeC0fc876cD87eF52e80D29E7D8',label: 'IEX SPY'})
        this.state.resolvers.push({value: '0xb03f9dc90997b2b2f8bfc97cd546ca05628b196f',label: 'Resolve 27000'})
        this.state.resolvers.push({value: '0x25e196efecc3b52e6e64ee331ce02704e6eebf95',label: 'CoinCap ETHUSD'})
        this.state.resolvers.push({value: '0x5ee7fe3726edce3ed3aea86f3a22ff6d28c54ece',label: 'CoinCap BTCUSD'})
        this.state.resolvers.push({value: '0xa4b09d1794dd1996b29a8b84f80e739df9810c67',label: 'OpenWeather NYC TEMP'})
      }
      if (this.props.networkId === '4') {
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

  handleCreateButton() {
    this.contracts.SmartPiggies.methods.createPiggy.cacheSend(
      this.state.collateralAddress,
      this.state.premiumAddress,
      this.state.oracleNowAddress,
      this.state.oracleAtExpiryAddress,
      this.state.collateralAmount,
      this.state.lotSizeAmount,
      this.state.strikePrice,
      this.state.blockExpiration,
      this.state.checkedEuro,
      this.state.checkedPut,
      this.state.checkedRFP,
      {from: this.state.accountAddress, gas: 5000000, gasPrice: 1100000000}
    )
  }

  render() {

    return (
      <div className="App">
      <Paper>
        <Typography variant="h5" style={{ padding: "10px" }}>Create a SmartPiggies Token</Typography>
        <Divider />
        <List>
            <ListItem>
                <ListItemText>Account Address:</ListItemText>
                <TextField
                    id="accountAddress"
                    label="AccountAddress"
                    value={this.state.accountAddress}
                    onChange={this.handleTextMenuChange('accountAddress')}
                    margin="normal"
                    variant="filled"
                >
                </TextField>
            </ListItem>
            <ListItem>
                <ListItemText>Collateral Address:</ListItemText>
                <TextField
                    id="collateralAddress"
                    select
                    label="Collateral"
                    value={this.state.collateralAddress}
                    onChange={this.handleTextMenuChange('collateralAddress')}
                    helperText="select a collateral contract"
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
                <ListItemText>Premium Address:</ListItemText>
                <TextField
                    id="premiumAddress"
                    select
                    label="Premium"
                    value={this.state.premiumAddress}
                    onChange={this.handleTextMenuChange('premiumAddress')}
                    helperText="select a premium contract"
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
                <ListItemText>Oracle Address:</ListItemText>
                <TextField
                    id="oracleNowAddress"
                    select
                    label="Oracle"
                    value={this.state.oracleNowAddress}
                    onChange={this.handleTextMenuChange('oracleNowAddress')}
                    helperText="select an oracle for the underlying"
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
                <ListItemText>Oracle Address at Expiry:</ListItemText>
                <TextField
                    id="oracleAtExpiryAddress"
                    select
                    label="OracleExipry"
                    value={this.state.oracleAtExpiryAddress}
                    onChange={this.handleTextMenuChange('oracleAtExpiryAddress')}
                    helperText="select an oracle for expiration"
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
                <ListItemText>Units Denomination:</ListItemText>
                <TextField
                    id="denomination"
                    select
                    label="denomination"
                    value={this.state.collateralAmount}
                    onChange={this.handleTextMenuChange('collateralAmount')}
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
                <ListItemText>Collateral Amount:</ListItemText>
                <TextField
                    id="collateralAmount"
                    label="collateralAmount"
                    value={this.state.collateralAmount}
                    onChange={this.handleTextMenuChange('collateralAmount')}
                    margin="normal"
                    variant="filled"
                />
            </ListItem>
            <ListItem>
                <ListItemText>Lot Size Amount:</ListItemText>
                <TextField
                    id="lotSizeAmount"
                    label="lotSizeAmount"
                    value={this.state.lotSizeAmount}
                    onChange={this.handleTextMenuChange('lotSizeAmount')}
                    margin="normal"
                    variant="filled"
                />
            </ListItem>
            <ListItem>
                <ListItemText>Strike Price:</ListItemText>
                <TextField
                    id="strikePrice"
                    label="strikePrice"
                    value={this.state.strikePrice}
                    onChange={this.handleTextMenuChange('strikePrice')}
                    margin="normal"
                    variant="filled"
                />
            </ListItem>
            <ListItem>
                <ListItemText>Blocks Until Expiration:</ListItemText>
                <TextField
                    id="blockExpiration"
                    label="blockExpiration"
                    value={this.state.blockExpiration}
                    onChange={this.handleTextMenuChange('blockExpiration')}
                    margin="normal"
                    variant="filled"
                />
            </ListItem>
            <ListItem>
                <ListItemText>Is this a European Option?:</ListItemText>
                <Checkbox
                    checked={this.state.checkedEuro}
                    onChange={this.handleCheckedInputChange('checkedEuro')}
                    value="checkedEuro"
                    color="default"
                />
            </ListItem>
            <ListItem>
                <ListItemText>Is this a Put Option?:</ListItemText>
                <Checkbox
                    checked={this.state.checkedPut}
                    onChange={this.handleCheckedInputChange('checkedPut')}
                    value="checkedPut"
                    color="default"
                />
            </ListItem>
            <ListItem>
                <ListItemText>Is this a Request for Piggy?:</ListItemText>
                <Checkbox
                    checked={this.state.checkedRFP}
                    onChange={this.handleCheckedInputChange('checkedRFP')}
                    value="checkedRFP"
                    color="default"
                />
            </ListItem>
        </List>
        <Button variant="contained" color="primary" size="large" style={{marginBottom: "15px"}} onClick={this.handleCreateButton}>Create Piggy</Button>
        </Paper>
      </div>
    )
  }
}

CreatePiggy.contextTypes = {
  drizzle: PropTypes.object
}

// May still need this even with data function to refresh component on updates for this contract.
const mapStateToProps = state => {
  return {
    accounts: state.accounts,
    SmartPiggies: state.contracts.SmartPiggies,
    StableToken: state.contracts.StableToken,
    StableTokenFaucet: state.contracts.StableTokenFaucet,
    TestnetLINK: state.contracts.TestnetLINK,
    drizzleStatus: state.drizzleStatus,
    transactionStack: state.transactionStack,
    transactions: state.transactions
  }
}

export default drizzleConnect(CreatePiggy, mapStateToProps)
