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

import PiggyDetail from "../PiggyDetail";

const BN = web3.utils.BN

class SatisfyAuction extends Component {
  constructor(props, context) {
    super(props)

    this.contracts = context.drizzle.contracts

    this.handleTextMenuChange = this.handleTextMenuChange.bind(this)
    this.handleSatisfyButton = this.handleSatisfyButton.bind(this)
    this.handlepiggyIdsButton = this.handlepiggyIdsButton.bind(this)

    this.state = {
      addresses: [],
      resolvers: [
        {
          value: '0xf2F63e91EB0a25cb1FE7cB9A8D41aac034C493E0',
          label: 'CL-IEX-SPY',
        },
      ],
      currencies: [
        {
          value: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359',
          label: 'Dai',
        },
        {
          value: '0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd',
          label: 'Gemini Dollar',
        },
        {
          value: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          label: 'USD Coin',
        },
      ],
      piggyIds: [],
      accountAddress: '0x0000000000000000000000000000000000000000',
      tokenAddress: '0x0000000000000000000000000000000000000000',
      piggyId: '0',
      startPrice: '',
      reservePrice: '',
      auctionLength: '',
      timeStep: '',
      priceStep: '',
    }
  }

  componentDidMount() {
    let addressArray = []
    let currencyArray = this.state.currencies
    currencyArray.push({value: this.contracts.StableToken.address, label: 'STBLE'})
    currencyArray.push({value: this.contracts.RopstenLINK.address, label: 'Link'})
    //this.state.resolvers.push({value: this.contracts.OracleResolver.address, label: 'OracleIEXSPY'})
    for (var i = 0; i < 4; i++) {
      addressArray.push(
        {
          value: this.props.accounts[i],
          label: "account " + i
        },
      )
    }
    this.setState({
      accountAddress: this.props.accounts[0],
      addresses: addressArray,
      currencies: currencyArray
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

  handleSatisfyButton() {
    if (this.state.accountAddress !== '0x0000000000000000000000000000000000000000') {
      this.contracts.SmartPiggies.methods.satisfyAuction(
        this.state.piggyId
      ).send({from: this.state.accountAddress, gas: 500000}).then(result => {console.log(result)})
    }
  }

  handlepiggyIdsButton() {
    if (this.state.accountAddress !== '0x0000000000000000000000000000000000000000') {
      this.contracts.SmartPiggies.methods.getOwnedPiggies(
        this.state.accountAddress
      ).call({from: this.state.accountAddress})
      .then(result => {
        for (let i =0; i < result.length; i++) {
          this.state.piggyIds.push(
            {
              value: result[i],
              label: "token " + (i +1)
            }
          )
        }
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
