import React, { Component } from 'react'
import { drizzleConnect } from 'drizzle-react'
import PropTypes from 'prop-types'
import web3 from 'web3'


import Button from '@material-ui/core/Button'
import MenuItem from '@material-ui/core/MenuItem'
import TextField from '@material-ui/core/TextField'
import Paper from '@material-ui/core/Paper'

import ClaimPayout from '../../Layout/ClaimPayout'

const BN = web3.utils.BN

class Settlement extends Component {
  constructor(props, context) {
    super(props)

    this.contracts = context.drizzle.contracts

    this.handleInputChange = this.handleInputChange.bind(this)
    this.handleTextMenuChange = this.handleTextMenuChange.bind(this)
    this.handleTextInputChange = this.handleTextInputChange.bind(this)
    this.handleCheckedInputChange = this.handleCheckedInputChange.bind(this)
    this.handleButton = this.handleButton.bind(this)
    this.handleTokenIdsButton = this.handleTokenIdsButton.bind(this)

    this.state = {
      tokenId: '0',
      tokenIds: [],
      addresses: [],
      accountAddress: '0x0000000000000000000000000000000000000000',
    }
  }

  componentDidMount() {
    let addressArray = []
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
      addresses: addressArray
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
    this.contracts.SmartPiggies.methods.settlePiggy(
      this.state.tokenId
    ).send({from: this.state.accountAddress, gas: 1000000})
    .then(result => {
      console.log(result)
    })
  }

  handleTokenIdsButton() {
    if (this.state.accountAddress !== '0x0000000000000000000000000000000000000000') {
      this.contracts.SmartPiggies.methods.getOwnedPiggies(
        this.state.accountAddress
      ).call({from: this.state.accountAddress})
      .then(result => {
        for (let i =0; i < result.length; i++) {
          this.state.tokenIds.push(
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
    //console.log(addresses)
    return (
      <div className="App">
      <Paper>
      <div>
        <h2>Settle a SmartPiggies token</h2>
      </div>
      <table>
        <tbody>
        <tr>
          <td>account address:</td>
          <td>
            <TextField
              id="accountAddress"
              select
              label="AccountAddress"
              value={this.state.accountAddress}
              onChange={this.handleTextMenuChange('accountAddress')}
              helperText="select an account"
              margin="normal"
              variant="filled"
              >
              {this.state.addresses.map(option => (
                <MenuItem key={option.value} value={option.value}>
                {option.label}
                </MenuItem>
              ))}
            </TextField>
          </td>
        </tr>
        <tr>
          <td>Owned Tokens:</td>
          <td>
            <TextField
              id="tokenId"
              select
              label="Token ID"
              value={this.state.tokenId}
              onChange={this.handleTextMenuChange('tokenId')}
              helperText="select a tokenId"
              margin="normal"
              variant="filled"
              >
              {this.state.tokenIds.map(option => (
                <MenuItem key={option.value} value={option.value}>
                {option.label}
                </MenuItem>
              ))}
            </TextField>
          </td>
        </tr>
          <tr>
            <td>Token ID:</td>
            <td>
              <TextField
                id="tokenId"
                label="tokenId"
                value={this.state.tokenId}
                onChange={this.handleTextMenuChange('tokenId')}
                margin="normal"
                variant="filled"
              />
            </td>
          </tr>
        </tbody>
      </table>
      <table align="center">
        <tbody>
          <tr>
            <td>
              <Button type="Button" variant="contained" onClick={this.handleTokenIdsButton}>Get Ids</Button>
            </td>
            <td width="20em" ></td>
            <td>
              <Button type="Button" variant="contained" onClick={this.handleButton}>Settle</Button>
            </td>
            <td width="20em" ></td>
            <td>
              <ClaimPayout />
            </td>
          </tr>
          <tr height="10em"></tr>
        </tbody>
      </table>
      </Paper>
      </div>
    )
  }
}

Settlement.contextTypes = {
  drizzle: PropTypes.object
}

// May still need this even with data function to refresh component on updates for this contract.
const mapStateToProps = state => {
  return {
    accounts: state.accounts,
    StableToken: state.contracts.StableToken,
    drizzleStatus: state.drizzleStatus,
    transactionStack: state.transactionStack,
    transactions: state.transactions
  }
}

export default drizzleConnect(Settlement, mapStateToProps)
