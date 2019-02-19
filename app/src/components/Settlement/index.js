import React, { Component } from 'react'
import { drizzleConnect } from 'drizzle-react'
import PropTypes from 'prop-types'
import web3 from 'web3'


import Button from '@material-ui/core/Button'
import Paper from '@material-ui/core/Paper'
import Typography from '@material-ui/core/Typography'
import Divider from '@material-ui/core/Divider'

//import ClaimPayout from '../../Layout/ClaimPayout'

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

    this.state = {
      tokenId: '0',
      accountAddress: '0x0000000000000000000000000000000000000000',
    }
  }

  componentDidMount() {
    this.setState({
      accountAddress: this.props.accounts[0],
      tokenId: this.props.tokenId,
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
    ).send({from: this.state.accountAddress, gas: 1000000, gasPrice: 1100000000})
    .then(result => {
      console.log(result)
    })
  }

  render() {
    //console.log(addresses)
    return (
      <div className="App">
      <Paper>
        <Typography variant="h5" style={{marginBottom: "15px"}}>Settle a SmartPiggies Token</Typography>
        <Divider />
        <br></br>
        <Typography variant="h6" style={{marginLeft: "10px", marginRight: "10px"}}>This token is ready to be cleared! Click below to query the oracle:</Typography>
        <br></br>
        <Button type="Button" variant="contained" color="primary" style={{marginBottom: "15px"}} onClick={this.handleButton}>Settle</Button>
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
